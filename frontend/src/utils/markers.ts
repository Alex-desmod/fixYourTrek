import L from 'leaflet'
import { pointIcon, startIcon, finishIcon } from './icons'

const pointMarkers = new WeakMap<any, L.Marker>()

let startMarker: L.Marker | null = null
let finishMarker: L.Marker | null = null

/* ---------- POINTS ---------- */

export function renderPointMarker(
  map: L.Map,
  point: any,
  { draggable = true } = {}
) {
  let marker = pointMarkers.get(point)

  if (!marker) {
    marker = L.marker([point.lat, point.lon], {
      icon: pointIcon,
      draggable
    }).addTo(map)

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng()
      // TODO reroute API
      console.log('drag point', lat, lng)
    })

    pointMarkers.set(point, marker)
  } else {
    marker.setLatLng([point.lat, point.lon])
  }

  return marker
}

export function clearPointMarkers(map: L.Map) {
  for (const marker of pointMarkers.values()) {
    map.removeLayer(marker)
  }
  pointMarkers.clear()
}

/* ---------- START / FINISH ---------- */

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
