export function findPointLocation(track: any, point: any) {
    for (let s = 0; s < track.segments.length; s++) {
        const segment = track.segments[s]
        const idx = segment.points.indexOf(point)
        if (idx !== -1) {
            return { segment_idx: s, point_idx: idx }
        }
    }
    return null
}
