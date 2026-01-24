import L from 'leaflet'

let previewLayers: L.Polyline[] = []

export function clearTrimPreview(map: L.Map) {
    for (const layer of previewLayers) {
        map.removeLayer(layer)
    }
    previewLayers = []
}

export function renderTrimPreview(
    map: L.Map,
    track: any,
    startId: number | null,
    endId: number | null
) {
    clearTrimPreview(map)

    if (!track || startId == null || endId == null) return

    for (const seg of track.segments) {
        const before = seg.points.filter(
            p => p.id < startId && p.lat != null && p.lon != null
        )

        const after = seg.points.filter(
            p => p.id > endId && p.lat != null && p.lon != null
        )

        drawTrimPart(map, before)
        drawTrimPart(map, after)
    }
}

function drawTrimPart(
    map: L.Map,
    points: any[]
) {
    if (points.length < 2) return

    const latlngs = points.map(p => [p.lat, p.lon]) as [number, number][]

    const poly = L.polyline(latlngs, {
        color: '#aaa',
        weight: 4,
        opacity: 0.6,
        dashArray: '6 4'
    }).addTo(map)

    previewLayers.push(poly)
}
