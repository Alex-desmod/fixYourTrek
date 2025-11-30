let map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let currentTrack = null;
let sessionId = null;
let polylineLayer = null;
let markersLayer = L.layerGroup().addTo(map);

// ----- uploading a track -----
document.getElementById("file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    let formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/track/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();
    sessionId = data.session_id;
    currentTrack = data.track;

    drawTrack(currentTrack);
});

// ----- displaying a track -----
function drawTrack(track) {
    if (polylineLayer) polylineLayer.remove();
    markersLayer.clearLayers();

    let latlngs = [];

    track.segments.forEach((seg) => {
        seg.points.forEach((p, idx) => {
            latlngs.push([p.lat, p.lon]);

            // point on the map
            let marker = L.circleMarker([p.lat, p.lon], {
                radius: 4,
                color: "red"
            }).addTo(markersLayer);

            marker.on("click", () => onPointSelected(seg, idx, p));
        });
    });

    polylineLayer = L.polyline(latlngs, { color: "blue" }).addTo(map);
    map.fitBounds(polylineLayer.getBounds());
}

// ----- clicking the point -----
async function onPointSelected(segment, index, point) {
    alert("Выберите новое место на карте");

    map.once("click", async (evt) => {
        const newLat = evt.latlng.lat;
        const newLon = evt.latlng.lng;

        const body = {
            session_id: sessionId,
            segment_idx: 0,    // пока считаем что один сегмент
            point_idx: index,
            new_lat: newLat,
            new_lon: newLon,
            mode: "snap"
        };

        const res = await fetch("/api/track/reroute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        currentTrack = data.track;
        drawTrack(currentTrack);
    });
}

// ----- Undo -----
document.getElementById("undo-btn").addEventListener("click", async () => {
    if (!sessionId) return;

    const res = await fetch(`/api/track/undo?session_id=${sessionId}`, {
        method: "POST"
    });

    const data = await res.json();
    currentTrack = data.track;
    drawTrack(currentTrack);
});

// ----- Export GPX -----
document.getElementById("export-gpx-btn").addEventListener("click", () => {
    window.location.href = `/api/track/export/${sessionId}?format=gpx`;
});

// ----- Export FIT -----
document.getElementById("export-fit-btn").addEventListener("click", () => {
    window.location.href = `/api/track/export/${sessionId}?format=fit`;
});
