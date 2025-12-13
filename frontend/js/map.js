let map;
let trackPolyline = null;
let startMarker = null;
let endMarker = null;

const startIcon = L.icon({
    iconUrl: '/static/icons/start.svg',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const finishIcon = L.icon({
    iconUrl: '/static/icons/finish.svg',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

export function initMap() {
    map = L.map('map').setView([25, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    return map;
}

export function renderTrack(track) {
    if (trackPolyline) map.removeLayer(trackPolyline);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);

    const points = track.segments.flatMap(seg => seg.points);
    const latlngs = points
        .filter(p => p.lat !== null && p.lon !== null)
        .map(p => [p.lat, p.lon]);
    if (latlngs.length < 2) return;

    trackPolyline = L.polyline(latlngs, {color: "blue"}).addTo(map);
    map.fitBounds(trackPolyline.getBounds());

    if (latlngs.length >= 2) {
        startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
        endMarker   = L.marker(latlngs.at(-1), { icon: finishIcon }).addTo(map);
    }
}

export function onMapClick(callback) {
    map.on("click", callback);
}

export function addTempMarker(lat, lon, icon) {
    L.marker([lat, lon], { icon }).addTo(map);
}

