export function distanceToSegment(p, v, w) {
    const px = p.lat, py = p.lon;
    const vx = v.lat, vy = v.lon;
    const wx = w.lat, wy = w.lon;

    const l2 = (vx - wx)**2 + (vy - wy)**2;
    if (l2 === 0) return Math.hypot(px - vx, py - vy);

    let t = ((px - vx)*(wx - vx) + (py - vy)*(wy - vy)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projx = vx + t * (wx - vx);
    const projy = vy + t * (wy - vy);

    return Math.hypot(px - projx, py - projy);
}
