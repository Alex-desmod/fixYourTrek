import API from "./api.js";
import {
    initMap,
    renderTrack,
    onMapClick,
    addPointMarker,
    clearPointMarkers
} from "./map.js";
import { initMenu, initEditButton } from "./ui.js";
import { distanceToSegment } from "./geometry.js";

let sessionId = null;
let currentTrack = null;
let editMode = false;

initMap();

initMenu({
    open: () => document.getElementById("file-input").click(),
    export: () => alert("Export coming soon")
});

initEditButton(v => editMode = v);

// ---------- FILE UPLOAD ----------

document.getElementById("file-input").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await API.uploadTrack(file);
    sessionId = data.session_id;
    currentTrack = data.track;

    clearPointMarkers();
    renderTrack(currentTrack);
});

// ---------- MAP CLICK ----------

onMapClick(async e => {
    if (!editMode || !currentTrack) return;

    const click = e.latlng;

    // 1️⃣ EXISTING POINT
    for (let s = 0; s < currentTrack.segments.length; s++) {
        const pts = currentTrack.segments[s].points;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (!p.lat) continue;

            if (L.latLng(p.lat, p.lon).distanceTo(click) < 10) {
                addPointMarker(p, {
                    onDragEnd: async (lat, lon, radius_m) => {
                        const data = await API.reroutePoint({
                            session_id: sessionId,
                            segment_idx: s,
                            point_idx: i,
                            new_lat: lat,
                            new_lon: lon,
                            radius_m,
                            mode: "straight"
                        });

                        currentTrack = data.track;
                        renderTrack(currentTrack, { preserveView: true });
                    }
                });
                return;
            }
        }
    }

    // 2️⃣ POLYLINE
    let best = { d: Infinity, s: 0, prev: 0 };

    for (let s = 0; s < currentTrack.segments.length; s++) {
        const pts = currentTrack.segments[s].points;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            if (!a.lat || !b.lat) continue;

            const d = distanceToSegment(click, a, b);
            if (d < best.d) best = { d, s, prev: i };
        }
    }

    if (best.d < 15) {
        const data = await API.addPoint({
            session_id: sessionId,
            segment_idx: best.s,
            prev_point_idx: best.prev,
            lat: click.lat,
            lon: click.lng
        });

        currentTrack = data.track;
        renderTrack(currentTrack);

        const p = currentTrack.segments[best.s].points[best.prev + 1];
        addPointMarker(p);
    }
});
