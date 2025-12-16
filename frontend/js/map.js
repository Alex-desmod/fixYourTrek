import { showMarkerContextMenu } from "./ui.js";

let map;
let trackPolyline = null;
let startMarker = null;
let endMarker = null;
let trackData = null;

const pointMarkers = new Map();   // key = "seg:idx"
const markerRadius = new Map();   // key = "seg:idx"

const startIcon = L.icon({
    iconUrl: "/static/icons/start.svg",
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const finishIcon = L.icon({
    iconUrl: "/static/icons/finish.svg",
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});


// ---------------- MAP INIT ----------------

export function initMap() {
    map = L.map("map", {
        zoomControl: false
    }).setView([25, 0], 3);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.scale({
        position: "bottomright",
        metric: true,
        imperial: false
    }).addTo(map);

    return map;
}


// ---------------- RENDER TRACK ----------------

export function renderTrack(track, { preserveView = false } = {}) {
    trackData = track;

    if (trackPolyline) map.removeLayer(trackPolyline);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);

    const points = track.segments.flatMap(seg =>
        seg.points.filter(p => p.lat != null && p.lon != null)
    );

    if (points.length < 2) return;

    const latlngs = points.map(p => [p.lat, p.lon]);

    trackPolyline = L.polyline(latlngs, { color: "blue" }).addTo(map);

    if (!preserveView) {
        map.fitBounds(trackPolyline.getBounds());
    }

    startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
    endMarker = L.marker(latlngs.at(-1), { icon: finishIcon }).addTo(map);
}


// ---------------- MAP CLICK ----------------

export function onMapClick(cb) {
    map.on("click", cb);
}


// ---------------- POINT MARKERS ----------------

export function addPointMarker(
    segment_idx,
    point_idx,
    lat,
    lon,
    { onDragEnd, onEditTime } = {}
) {
    if (!trackData) return;

    const key = `${segment_idx}:${point_idx}`;
    if (pointMarkers.has(key)) return;

    if (!markerRadius.has(key)) {
        markerRadius.set(key, 50);
    }

    const marker = L.marker([lat, lon], {
        draggable: true,
        icon: L.divIcon({
            className: "selected-point-marker",
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        })
    }).addTo(map);

    pointMarkers.set(key, marker);

    // ---- drag ----
    marker.on("dragstart", () => map.dragging.disable());

    marker.on("dragend", e => {
        map.dragging.enable();

        const { lat: newLat, lng: newLon } = e.target.getLatLng();
        if (onDragEnd) {
            onDragEnd(newLat, newLon, markerRadius.get(key));
        }
    });

    // ---- context menu ----
    marker.on("contextmenu", e => {
        e.originalEvent.preventDefault();

        const point =
            trackData.segments[segment_idx]?.points[point_idx];

        if (!point) return;

        showMarkerContextMenu(
            e.originalEvent.clientX,
            e.originalEvent.clientY,
            {
                segment_idx,
                point_idx,
                time: point.time,
                radius_m: markerRadius.get(key),

                onRadiusChange: r => markerRadius.set(key, r),
                onEditTime
            }
        );
    });
}


// ---------------- CLEAR ----------------

export function clearPointMarkers() {
    for (const marker of pointMarkers.values()) {
        map.removeLayer(marker);
    }
    pointMarkers.clear();
}
