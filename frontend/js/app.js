import API from "./api.js";
import {
    initMap,
    renderTrack,
    onMapClick,
    addPointMarker,
    clearPointMarkers
} from "./map.js";
import { initMenu, initEditButton } from "./ui.js";

let sessionId = null;
let currentTrack = null;
let editMode = false;

// ========================
// INIT
// ========================
initMap();

initMenu({
    open: () => document.getElementById("file-input").click(),
    export: () => alert("Export coming soon…")
});

initEditButton(mode => editMode = mode);

// ========================
// FILE UPLOAD
// ========================
document.getElementById("file-input").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await API.uploadTrack(file);
    sessionId = data.session_id;
    currentTrack = data.track;

    clearPointMarkers();
    renderTrack(currentTrack);
});

// ========================
// MAP CLICK
// ========================
onMapClick(async e => {
    if (!editMode || !currentTrack) return;

    const clickLat = e.latlng.lat;
    const clickLon = e.latlng.lng;

    const CLICK_POINT_M = 10;
    const CLICK_LINE_M = 15;

    // -------------------------------------------------
    // 1) CLICK ON EXISTING POINT
    // -------------------------------------------------
    let bestPoint = null;

    for (let s = 0; s < currentTrack.segments.length; s++) {
        const pts = currentTrack.segments[s].points;

        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.lat == null || p.lon == null) continue;

            const d = L.latLng(p.lat, p.lon)
                .distanceTo(e.latlng);

            if (d < CLICK_POINT_M) {
                bestPoint = { s, i, p };
                break;
            }
        }
        if (bestPoint) break;
    }

    if (bestPoint) {
        addPointMarker(
            bestPoint.s,
            bestPoint.i,
            bestPoint.p.lat,
            bestPoint.p.lon,
            {
                onDragEnd: async (newLat, newLon, radius_m) => {
                    const data = await API.reroutePoint({
                        session_id: sessionId,
                        segment_idx: bestPoint.s,
                        point_idx: bestPoint.i,
                        new_lat: newLat,
                        new_lon: newLon,
                        radius_m,
                        mode: "straight"
                    });

                    currentTrack = data.track;
                    clearPointMarkers();
                    renderTrack(currentTrack, { preserveView: true });
                }
            }
        );
        return;
    }

    // -------------------------------------------------
    // 2) CLICK ON POLYLINE → INSERT POINT
    // -------------------------------------------------
    let best = { d: Infinity, seg: 0, prev: 0 };

    for (let s = 0; s < currentTrack.segments.length; s++) {
        const pts = currentTrack.segments[s].points;

        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            if (!a.lat || !a.lon || !b.lat || !b.lon) continue;

            const closest = L.GeometryUtil.closestOnSegment(
                map,
                e.latlng,
                L.latLng(a.lat, a.lon),
                L.latLng(b.lat, b.lon)
            );

            const d = closest.distanceTo(e.latlng);
            if (d < best.d) {
                best = { d, seg: s, prev: i };
            }
        }
    }

    if (best.d <= CLICK_LINE_M) {
        const data = await API.addPoint({
            session_id: sessionId,
            segment_idx: best.seg,
            prev_point_idx: best.prev,
            lat: clickLat,
            lon: clickLon
        });

        currentTrack = data.track;
        renderTrack(currentTrack);

        // 👉 ВАЖНО: сразу показываем маркер новой точки
        const newIdx = best.prev + 1;
        const p = currentTrack.segments[best.seg].points[newIdx];

        addPointMarker(best.seg, newIdx, p.lat, p.lon);
        return;
    }

    // -------------------------------------------------
    // 3) OUTSIDE TRACK → START OR END
    // -------------------------------------------------
    const first = currentTrack.segments[0].points.find(p => p.lat != null);
    const lastSeg = currentTrack.segments.at(-1);
    const last = [...lastSeg.points].reverse().find(p => p.lat != null);

    const dStart = L.latLng(first.lat, first.lon).distanceTo(e.latlng);
    const dEnd = L.latLng(last.lat, last.lon).distanceTo(e.latlng);

    if (dStart < dEnd) {
        const data = await API.addPoint({
            session_id: sessionId,
            segment_idx: 0,
            prev_point_idx: -1,
            lat: clickLat,
            lon: clickLon
        });

        currentTrack = data.track;
        renderTrack(currentTrack);

        const p = currentTrack.segments[0].points[0];
        addPointMarker(0, 0, p.lat, p.lon);
    } else {
        const lastIdx = lastSeg.points.length - 1;

        const data = await API.addPoint({
            session_id: sessionId,
            segment_idx: currentTrack.segments.length - 1,
            prev_point_idx: lastIdx,
            lat: clickLat,
            lon: clickLon
        });

        currentTrack = data.track;
        renderTrack(currentTrack);

        const p = currentTrack.segments.at(-1).points.at(-1);
        addPointMarker(
            currentTrack.segments.length - 1,
            lastIdx + 1,
            p.lat,
            p.lon
        );
    }
});
