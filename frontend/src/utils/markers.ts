import L from 'leaflet'
import { pointIcon, startIcon, finishIcon } from './icons'

type Point = {
    id: string
    lat: number
    lon: number
}

/* ---------- STORAGE ---------- */

// point.id -> marker
const pointMarkers = new Map<string, L.Marker>()

// UI state per point.id
const pointUI = new Map<string, { influenceRadius: number }>()

let startMarker: L.Marker | null = null
let finishMarker: L.Marker | null = null

/* ---------- POINTS ---------- */

export function renderPointMarker(
    map: L.Map,
    point: Point,
    onContextMenu?: (point: Point, e: MouseEvent) => void
) {
    const id = point.id
    if (!id) {
        console.warn('Point without id', point)
        return
    }

    let marker = pointMarkers.get(id)

    if (!marker) {
        // init UI state
        if (!pointUI.has(id)) {
            pointUI.set(id, { influenceRadius: 50 })
        }

        marker = L.marker([point.lat, point.lon], {
            icon: pointIcon,
            draggable: true
        }).addTo(map)

        // store callback on marker instance
        ;(marker as any)._onContextMenu = onContextMenu

        marker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault()
            e.originalEvent.stopPropagation()

            const cb = (marker as any)._onContextMenu
            if (typeof cb === 'function') {
                cb(point, e.originalEvent)
            }
        })

        marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng()
            // TODO: call reroute API
            console.log('drag point', id, lat, lng)
        })

        pointMarkers.set(id, marker)
    } else {
        // update position
        marker.setLatLng([point.lat, point.lon])
        ;(marker as any)._onContextMenu = onContextMenu
    }

    return marker
}

export function deletePointMarker(map: L.Map, point: Point) {
    const id = point.id
    const marker = pointMarkers.get(id)
    if (!marker) return

    map.removeLayer(marker)
    pointMarkers.delete(id)
    pointUI.delete(id)
}

export function getPointUI(point: Point) {
    const id = point.id
    if (!pointUI.has(id)) {
        pointUI.set(id, { influenceRadius: 50 })
    }
    return pointUI.get(id)!
}

export function clearPointMarkers(map: L.Map) {
    for (const marker of pointMarkers.values()) {
        map.removeLayer(marker)
    }
    pointMarkers.clear()
    pointUI.clear()
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
