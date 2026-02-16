import L from 'leaflet'

export interface TrackPoint {
    id: string
    lat: number
    lon: number
    ele?: number
    time?: string
}

export interface TrackSegment {
    points: TrackPoint[]
}

export interface Track {
    segments: TrackSegment[]
}

export interface ProfilePoint {
    lat: number
    lon: number
    ele: number | null
    distKm: number
    speed: number | null
    point: TrackPoint
}

export function buildProfile(track: Track): ProfilePoint[] {
    const pts: ProfilePoint[] = []
    let distKm = 0

    for (const seg of track.segments) {
        for (let i = 0; i < seg.points.length; i++) {
            const p = seg.points[i]
            if (!p) continue
            let speed: number | null = null

            if (i > 0) {
                const prev = seg.points[i - 1]

                if (prev) {
                    const distM =
                        L.latLng(prev.lat, prev.lon)
                            .distanceTo([p.lat, p.lon])

                    distKm += distM / 1000

                    if (prev.time && p.time) {
                        const dt =
                            (new Date(p.time).getTime() -
                             new Date(prev.time).getTime()) / 1000

                        if (dt > 0) {
                            speed = distM / dt
                        }
                    }
                }
            }

            pts.push({
                lat: p.lat,
                lon: p.lon,
                ele: p.ele ?? null,
                distKm,
                speed,
                point: p
            })
        }
    }

    return pts
}
