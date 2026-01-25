import L from 'leaflet'

let previewLayers: L.Polyline[] = []

export interface FlatPoint {
    id: string
    lat: number
    lon: number
    segment_idx: number
    point_idx: number
}

export function flattenTrack(track: any): FlatPoint[] {
    const res: FlatPoint[] = []

    track.segments.forEach((seg, sIdx) => {
        seg.points.forEach((p, pIdx) => {
            if (p.lat != null && p.lon != null) {
                res.push({
                    id: p.id,
                    lat: p.lat,
                    lon: p.lon,
                    segment_idx: sIdx,
                    point_idx: pIdx
                })
            }
        })
    })

    return res
}

export function clearTrimPreview(map: L.Map) {
    for (const l of previewLayers) {
        map.removeLayer(l)
    }
    previewLayers = []
}

export function renderTrimPreview(
    map: L.Map,
    track: any,
    startId: string,
    endId: string
) {
    clearTrimPreview(map)

    if (!track || !startId || !endId) return

    const flat = flattenTrack(track)

    const startIdx = flat.findIndex(p => p.id === startId)
    const endIdx   = flat.findIndex(p => p.id === endId)

    if (startIdx === -1 || endIdx === -1) return
    if (startIdx >= endIdx) return

    const before = flat.slice(0, startIdx + 1)
    const after  = flat.slice(endIdx)

    drawRange(map, before, '#999')
    drawRange(map, after, '#999')
}

function drawRange(map: L.Map, pts: FlatPoint[], color: string) {
    if (pts.length < 2) return

    const latlngs = pts.map(p => [p.lat, p.lon]) as [number, number][]

    const poly = L.polyline(latlngs, {
        color: "#808080",
        weight: 4,
        opacity: 0.9
    }).addTo(map)

    previewLayers.push(poly)
}
