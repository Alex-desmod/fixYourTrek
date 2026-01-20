import L from 'leaflet'

export interface ProfilePoint {
    lat: number
    lon: number
    ele: number | null
    distKm: number
    point: any
}

export function buildProfile(track: any): ProfilePoint[] {
    const pts: ProfilePoint[] = []
    let dist = 0

    for (const seg of track.segments) {
        for (let i = 0; i < seg.points.length; i++) {
            const p = seg.points[i]

            if (i > 0) {
                const prev = seg.points[i - 1]
                dist += L.latLng(prev.lat, prev.lon)
                .distanceTo([p.lat, p.lon]) / 1000
            }

            pts.push({
                lat: p.lat,
                lon: p.lon,
                ele: p.ele ?? null,
                distKm: dist,
                point: p
            })
        }
    }

    return pts
}
