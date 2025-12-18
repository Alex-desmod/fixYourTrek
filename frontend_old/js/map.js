import { showMarkerContextMenu } from "./ui.js";

let map;
let polyline = null;

/**
 * UI-state connected to a point
 */
const pointMarkers = new WeakMap();   // point -> Leaflet marker
const markerRadius = new WeakMap();   // point -> number
const allMarkers = new Set();

// ---------- INIT ----------

export function initMap() {
    map = L.map("map", { zoomControl: false }).setView([20, 0], 3);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.scale({ position: "bottomright" }).addTo(map);

    return map;
}

// ---------- RENDER TRACK ----------

export function renderTrack(track, { preserveView = false } = {}) {
    if (polyline) map.removeLayer(polyline);

    const pts = track.segments.flatMap(s =>
        s.points.filter(p => p.lat != null && p.lon != null)
    );

    if (pts.length < 2) return;

    const latlngs = pts.map(p => [p.lat, p.lon]);
    polyline = L.polyline(latlngs, { color: "blue" }).addTo(map);

    if (!preserveView) {
        map.fitBounds(polyline.getBounds());
    }

    // update marker positions
    for (const p of pts) {
        const marker = pointMarkers.get(p);
        if (marker) {
            marker.setLatLng([p.lat, p.lon]);
        }
    }
}

// ---------- EVENTS ----------

export function onMapClick(cb) {
    map.on("click", cb);
}

// ---------- POINT MARKERS ----------

export function addPointMarker(point, { onDragEnd, onEditTime } = {}) {
    if (pointMarkers.has(point)) return;

    if (!markerRadius.has(point)) {
        markerRadius.set(point, 50);
    }

    const marker = L.marker([point.lat, point.lon], {
        draggable: true,
        icon: L.divIcon({
            className: "selected-point-marker",
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        })
    }).addTo(map);

    pointMarkers.set(point, marker);
    allMarkers.add(marker);

    marker.on("dragstart", () => map.dragging.disable());

    marker.on("dragend", e => {
        map.dragging.enable();
        const ll = e.target.getLatLng();
        onDragEnd?.(ll.lat, ll.lng, markerRadius.get(point));
    });

    marker.on("contextmenu", e => {
        e.originalEvent.preventDefault();

        showMarkerContextMenu(
            e.originalEvent.clientX,
            e.originalEvent.clientY,
            {
                time: point.time,
                radius_m: markerRadius.get(point),
                onRadiusChange: r => markerRadius.set(point, r),
                onEditTime
            }
        );
    });
}

// ---------- CLEAR ----------

export function clearPointMarkers() {
    for (const marker of allMarkers) {
        map.removeLayer(marker);
    }
    allMarkers.clear();
}