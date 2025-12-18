export function distanceToSegment(p, a, b) {
    const latLngP = L.latLng(p.lat, p.lon);
    const latLngA = L.latLng(a.lat, a.lon);
    const latLngB = L.latLng(b.lat, b.lon);

    const px = latLngP.lng;
    const py = latLngP.lat;
    const ax = latLngA.lng;
    const ay = latLngA.lat;
    const bx = latLngB.lng;
    const by = latLngB.lat;

    const dx = bx - ax;
    const dy = by - ay;

    if (dx === 0 && dy === 0) {
        return latLngP.distanceTo(latLngA);
    }

    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));

    const projLat = ay + clamped * dy;
    const projLon = ax + clamped * dx;

    return latLngP.distanceTo(L.latLng(projLat, projLon));
}
