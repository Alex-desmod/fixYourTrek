import L from 'leaflet'

let previewLayers: L.Polyline[] = []

export function clearNormalizePreview(map: L.Map) {
    for (const layer of previewLayers) {
        map.removeLayer(layer)
    }
    previewLayers = []
}

export function renderNormalizePreview(
    map: L.Map,
    track: any,
    preview: any
) {
    clearNormalizePreview(map)

    if (!preview?.stucks?.length) return

    for (const stuck of preview.stucks) {
        const segment = track.segments[stuck.segment_idx]
        if (!segment) continue

        const pts = segment.points
        .slice(stuck.start_idx, stuck.end_idx + 1)
        .filter(p => p.lat != null && p.lon != null)

        if (pts.length < 2) continue

        const latlngs = pts.map(p => [p.lat, p.lon]) as [number, number][]

        const poly = L.polyline(latlngs, {
            color: 'red',
            weight: 4,
            opacity: 0.9
        }).addTo(map)

        previewLayers.push(poly)
    }
}
