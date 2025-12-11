let map;
let trackPolyline = null;
let startMarker = null;
let endMarker = null;

const startIcon = L.icon({
    iconUrl: '/static/icons/start.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const finishIcon = L.icon({
    iconUrl: '/static/icons/finish.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

export function initMap() {
    map = L.map('map').setView([55.75, 37.6], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    return map;
}

export function renderTrack(track) {
    if (trackPolyline) map.removeLayer(trackPolyline);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);

    const points = track.segments.flatMap(seg => seg.points);
    const latlngs = points.map(p => [p.lat, p.lon]);

    trackPolyline = L.polyline(latlngs, {color: "blue"}).addTo(map);
    map.fitBounds(trackPolyline.getBounds());

    if (points.length > 0) {
        startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
        endMarker   = L.marker(latlngs.at(-1), { icon: finishIcon }).addTo(map);
    }
}

export function onMapClick(callback) {
    map.on("click", callback);
}
