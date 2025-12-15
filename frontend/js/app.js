import API from "./api.js";
import { initMap, renderTrack, onMapClick, addPointMarker, clearPointMarkers } from "./map.js";
import { initMenu, initEditButton } from "./ui.js";

let sessionId = null;
let currentTrack = null;
let editMode = false;

// ========================
//  INIT
// ========================
const map = initMap();

initMenu({
    open: () => document.getElementById("file-input").click(),
    export: () => alert("Export coming soon…"),
    undo: () => console.log("Undo"),
    redo: () => console.log("Redo")
});

initEditButton(mode => editMode = mode);

// ========================
//  FILE UPLOAD
// ========================
document.getElementById("file-input").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await API.uploadTrack(file);
    sessionId = data.session_id;
    currentTrack = data.track;

    renderTrack(currentTrack);
});

// ========================
//  SELECT POINT MARKER
// ========================
const selectedPointIcon = L.divIcon({
    className: "selected-point-marker",
    iconSize: [8, 8],
    iconAnchor: [4, 4]
});

// ========================
//  ADD POINT REQUEST
// ========================
async function addPointRequest(segment_idx, prev_point_idx, lat, lon) {
    const body = {
        session_id: sessionId,
        segment_idx,
        prev_point_idx,
        lat,
        lon
    };

    const resp = await fetch("/api/track/add_point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const errText = await resp.text();
        console.error("Server error:", resp.status, errText);
        alert("Server error. Check console.");
        return;
    }

    const data = await resp.json();
    currentTrack = data.track;
    renderTrack(currentTrack);
}

// ========================
//  MAP CLICK LOGIC
// ========================
onMapClick(async (e) => {
    if (!editMode || !currentTrack) return;

    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    const click = { lat, lon };

    const CLICK_POINT_PX = 12;
    const CLICK_LINE_M = 18;

    let selectedSeg = null;
    let selectedIdx = null;
    let minDistPoint = Infinity;

    // -------------------------------------------------
    // 1) CHECK CLICK ON EXISTING POINT
    // -------------------------------------------------
    for (let s = 0; s < currentTrack.segments.length; s++) {
        const pts = currentTrack.segments[s].points;

        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];

            // skipping points without GPS
            if (p.lat === null || p.lon === null) continue;

            const d = L.latLng(p.lat, p.lon).distanceTo(e.latlng);

            if (d < minDistPoint) {
                minDistPoint = d;
                selectedSeg = s;
                selectedIdx = i;
            }
        }
    }

    if (minDistPoint <= CLICK_POINT_PX) {
    console.log("Selected existing point:", selectedSeg, selectedIdx);
    const p = currentTrack.segments[selectedSeg].points[selectedIdx];
    addPointMarker(
        selectedSeg,
        selectedIdx,
        p.lat,
        p.lon,
        async (newLat, newLon) => {
            await reroutePoint(selectedSeg, selectedIdx, newLat, newLon);
        }
);

    return;
    }


    // -------------------------------------------------
    // 2) CHECK CLICK ON SEGMENT (LINE)
    // -------------------------------------------------
    let best = { d: Infinity, segIdx: 0, prev: 0 };

    function distToSegment(p, v, w) {
        const pLL = L.latLng(p.lat, p.lon);
        const vLL = L.latLng(v.lat, v.lon);
        const wLL = L.latLng(w.lat, w.lon);

        const closest = L.GeometryUtil.closestOnSegment(map, pLL, vLL, wLL);
        return pLL.distanceTo(closest);
        }

    for (let s = 0; s < currentTrack.segments.length; s++) {
        const pts = currentTrack.segments[s].points;

        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];

            if (
                a.lat === null || a.lon === null ||
                b.lat === null || b.lon === null
            ) continue;

            const d = distToSegment(click, pts[i], pts[i+1]);
            if (d < best.d) {
                best = { d, segIdx: s, prev: i };
            }
        }
    }

    if (best.d <= CLICK_LINE_M) {
        console.log("Insert in middle:", best);
        await addPointRequest(best.segIdx, best.prev, lat, lon);
        return;
    }

    // -------------------------------------------------
    // 3) CLICK OUTSIDE TRACK — ADD TO START OR END
    // -------------------------------------------------
    const firstSeg = 0;
    const lastSeg = currentTrack.segments.length - 1;

    function firstValidPoint(points) {
        return points.find(p => p.lat !== null && p.lon !== null);
    }

    function lastValidPoint(points) {
        for (let i = points.length - 1; i >= 0; i--) {
            if (points[i].lat !== null && points[i].lon !== null) {
                return points[i];
            }
        }
        return null;
    }

    const startPoint = firstValidPoint(currentTrack.segments[0].points);
    const endPoint = lastValidPoint(
        currentTrack.segments.at(-1).points
    );

    const dStart = L.latLng(startPoint.lat, startPoint.lon).distanceTo(e.latlng);
    const dEnd = L.latLng(endPoint.lat, endPoint.lon).distanceTo(e.latlng);

    if (dStart < dEnd) {
        console.log("Add before start → prev_point_idx=-1");
        await addPointRequest(0, -1, lat, lon);
    } else {
        console.log("Add after end");
        await addPointRequest(lastSeg, currentTrack.segments[lastSeg].points.length - 1, lat, lon);
    }
});

// ========================
//  REROUTE LOGIC
// ========================
async function reroutePoint(segment_idx, point_idx, new_lat, new_lon, mode = "straight", radius_m = 50.0) {
    const body = {
        session_id: sessionId,
        segment_idx,
        point_idx,
        new_lat,
        new_lon,
        mode,
        radius_m
    };

    const resp = await fetch("/api/track/reroute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        alert("Reroute failed");
        return;
    }

    const data = await resp.json();
    currentTrack = data.track;
    renderTrack(currentTrack, { preserveView: true });
    clearPointMarkers();
}
