import L from 'leaflet'

let polyline: L.Polyline | null = null

export function renderTrack(
  map: L.Map,
  track: any,
  { preserveView = false } = {}
) {
  console.log('renderTrack called', { map, track })
  if (polyline) {
    map.removeLayer(polyline)
    polyline = null
  }

  const pts = track.segments.flatMap((s: any) =>
    s.points.filter((p: any) => p.lat != null && p.lon != null)
  )

  if (pts.length < 2) return

  const latlngs = pts.map((p: any) => [p.lat, p.lon])

  polyline = L.polyline(latlngs, {
    color: 'blue',
    weight: 4
  }).addTo(map)

  if (!preserveView) {
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] })
  }
}