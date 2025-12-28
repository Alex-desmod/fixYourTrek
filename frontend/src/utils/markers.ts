import L from 'leaflet'
import { pointIcon, startIcon, finishIcon } from './icons'

const pointMarkers = new WeakMap<any, L.Marker>()
const allPointMarkers = new Set<L.Marker>()
// UI state per point
const pointUI = new WeakMap<any, { influenceRadius: number }>()
// points whose marker is hidden by user
const hiddenPoints = new WeakSet<any>()

let startMarker: L.Marker | null = null
let finishMarker: L.Marker | null = null

/* ---------- POINTS ---------- */

export function renderPointMarker(
  map: L.Map,
  point: any,
  onContextMenu?: (point: any, latlng: L.LatLng) => void
) {
  if (hiddenPoints.has(point)) return

  let marker = pointMarkers.get(point)

  if (!marker) {
    if (!pointUI.has(point)) {
      pointUI.set(point, { influenceRadius: 50 })
    }

    marker = L.marker([point.lat, point.lon], {
      icon: pointIcon,
      draggable: true
    }).addTo(map)

    marker.on('contextmenu', (e) => {
      if (onContextMenu) {
        onContextMenu(point, e.latlng)
      }
    })

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng()
      // TODO reroute API
      console.log('drag point', lat, lng)
    })

    pointMarkers.set(point, marker)
    allPointMarkers.add(marker)
  } else {
    marker.setLatLng([point.lat, point.lon])
  }

  return marker
}

export function hidePointMarker(map: L.Map, point: any) {
  const marker = pointMarkers.get(point)
  if (!marker) return

  map.removeLayer(marker)
  allPointMarkers.delete(marker)
  pointMarkers.delete(point)
  pointUI.delete(point)
  hiddenPoints.add(point)
}

export function getPointUI(point: any) {
  return pointUI.get(point)
}

export function clearPointMarkers(map: L.Map) {
  for (const marker of allPointMarkers) {
    map.removeLayer(marker)
  }
  allPointMarkers.clear()
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
