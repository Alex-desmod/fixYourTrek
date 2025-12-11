import API from "./api.js";
import { initMap, renderTrack, onMapClick } from "./map.js";
import { distanceToSegment } from "./geometry.js";
import { initMenu, initEditButton } from "./ui.js";

let sessionId = null;
let currentTrack = null;
let editMode = false;

// ---- Initialization ----
const map = initMap();

initMenu(
    () => document.getElementById("file-input").click(),
    () => alert("Export coming soon...")
);

initEditButton(mode => editMode = mode);

// ---- Upload file ----
document.getElementById("file-input").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await API.uploadTrack(file);
    sessionId = data.session_id;
    currentTrack = data.track;

    renderTrack(currentTrack);
});

// ---- Insert a point ----
onMapClick(async e => {
    if (!editMode || !currentTrack) return;

    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    const points = currentTrack.segments.flat();
    let prevIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < points.length - 1; i++) {
        const d = distanceToSegment({lat, lon}, points[i], points[i+1]);
        if (d < minDist) {
            minDist = d;
            prevIdx = i;
        }
    }

    const req = {
        session_id: sessionId,
        segment_idx: 0,
        prev_point_idx: prevIdx,
        lat, lon
    };

    const result = await API.addPoint(req);
    currentTrack = result.track;
    renderTrack(currentTrack);
});
