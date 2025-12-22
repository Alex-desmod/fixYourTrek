import L from 'leaflet'
import startSvg from '@/assets/icons/start.svg?raw'
import finishSvg from '@/assets/icons/finish.svg?raw'

export const startIcon = L.divIcon({
  className: 'track-marker start-marker',
  html: startSvg,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

export const finishIcon = L.divIcon({
  className: 'track-marker finish-marker',
  html: finishSvg,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

let startMarker: L.Marker | null = null
let finishMarker: L.Marker | null = null

export function renderStartFinishMarkers(
  map: L.Map,
  pts: Array<{ lat: number; lon: number }>
) {
  if (pts.length < 2) return

  const start = pts[0]
  const finish = pts[pts.length - 1]

  const startLatLng: [number, number] = [start.lat, start.lon]
  const finishLatLng: [number, number] = [finish.lat, finish.lon]

  if (!startMarker) {
    startMarker = L.marker(startLatLng, {
      icon: startIcon,
      title: 'Start'
    }).addTo(map)
  } else {
    startMarker.setLatLng(startLatLng)
  }

  if (!finishMarker) {
    finishMarker = L.marker(finishLatLng, {
      icon: finishIcon,
      title: 'Finish'
    }).addTo(map)
  } else {
    finishMarker.setLatLng(finishLatLng)
  }
}
