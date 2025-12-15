let map;
let trackPolyline = null;
let startMarker = null;
let endMarker = null;

const pointMarkers = new Map();

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
    map = L.map("map", {
        zoomControl: false
    }).setView([25, 0], 3);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    L.control.zoom({
        position: "topright"
    }).addTo(map);

    L.control.scale({
        position: "bottomright",
        metric: true,
        imperial: false,
        maxWidth: 120
    }).addTo(map);
    return map;
}

export function renderTrack(track, { preserveView = false } = {}) {
    if (trackPolyline) map.removeLayer(trackPolyline);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);

    const points = track.segments.flatMap(seg => seg.points);
    const latlngs = points
        .filter(p => p.lat !== null && p.lon !== null)
        .map(p => [p.lat, p.lon]);
    if (latlngs.length < 2) return;

    trackPolyline = L.polyline(latlngs, {color: "blue"}).addTo(map);
    if (!preserveView && !map.getBounds().isValid()) {
        map.fitBounds(trackLayer.getBounds());
    }

    if (latlngs.length >= 2) {
        startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
        endMarker   = L.marker(latlngs.at(-1), { icon: finishIcon }).addTo(map);
    }
}

export function onMapClick(callback) {
    map.on("click", callback);
}

export function addPointMarker(segment_idx, point_idx, lat, lon, onDragEnd) {
    const key = `${segment_idx}:${point_idx}`;
    if (pointMarkers.has(key)) return;

    const startLatLng = L.latLng(lat, lon);

    const marker = L.marker(startLatLng, {
        draggable: true,
        icon: L.divIcon({
            className: "selected-point-marker",
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        })
    }).addTo(map);

    marker.on("dragstart", () => {
        map.dragging.disable();
    });

    marker.on("dragend", e => {
        map.dragging.enable();

        const newLatLng = e.target.getLatLng();

        if (startLatLng.distanceTo(newLatLng) < 0.5) return;

        onDragEnd(newLatLng.lat, newLatLng.lng);
    });

    pointMarkers.set(key, marker);
}

export function clearPointMarkers() {
    for (const marker of pointMarkers.values()) {
        map.removeLayer(marker);
    }
    pointMarkers.clear();
}
