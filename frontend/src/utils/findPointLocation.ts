export function findPointLocation(track: any, point: any) {
    if (!track?.segments || !point?.id) {
        console.warn('invalid args', { track, point })
        return null
    }

    for (let s = 0; s < track.segments.length; s++) {
        const segment = track.segments[s]
        const points = segment.points

        for (let i = 0; i < points.length; i++) {
            if (points[i].id === point.id) {
                return {
                    segment,
                    segment_idx: s,
                    index: i,
                    point_idx: i
                }
            }
        }
    }

    return null
}
