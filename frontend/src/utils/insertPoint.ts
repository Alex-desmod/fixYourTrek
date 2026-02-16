import L from 'leaflet'
import { addPoint } from '@/api/trackApi'
import { resolveInsertAction } from './trackGeometry'
import { renderPointMarker } from './markers'
import { useTrackStore } from '@/store/trackStore'

let clickHandler: ((e: L.LeafletMouseEvent) => void) | null = null

/**
 * Enable "Insert a point" mode
 */
export function enableInsertPointMode(
    map: L.Map,
    onPointContextMenu?: (point: any, e: MouseEvent) => void
) {
    const store = useTrackStore()

    clickHandler = async (e: L.LeafletMouseEvent) => {
        const track = store.track
        const sessionId = store.sessionId

        if (!track || !sessionId) return

        const { lat, lng } = e.latlng

        // Define what to do with the click
        const action = resolveInsertAction(track, lat, lng)

        // Select an existing point
        if (action.type === 'select-existing' && 'point' in action) {
            store.selectPoint(action.point)
            renderPointMarker(map, action.point, onPointContextMenu)
            return
        }

        function findPointInTrack(track: any, lat: number, lon: number) {
            for (const seg of track.segments) {
                for (const p of seg.points) {
                    if (
                        Math.abs(p.lat - lat) < 1e-9 &&
                        Math.abs(p.lon - lon) < 1e-9
                    ) {
                        return p
                    }
                }
            }
            return null
        }


        // Add a new point
        if (action.type !== 'insert-new' || action.prevPointIdx === undefined) {
            return
        }

        try {
            const payload = {
                session_id: sessionId,
                segment_idx: action.segmentIdx,
                prev_point_idx: action.prevPointIdx,
                lat,
                lon: lng
            }

            const res = await addPoint(payload)
            /**
                * Awaiting from the backend:
                * {
                *   track: updatedTrack,
                *   point: newlyCreatedPoint
                * }
            */
            store.lastUpdate = 'add_point'
            store.track = res.track
            const newPoint = findPointInTrack(res.track, lat, lng)
            if (!newPoint) {
                console.warn('Inserted point not found in track')
                return
            }

            store.selectPoint(newPoint)
            renderPointMarker(map, newPoint, onPointContextMenu)
        } catch (err) {
            console.error('Failed to add point', err)
        }
    }

    map.on('click', clickHandler)
}

/**
 * Disable "Insert a point" mode
 */
export function disableInsertPointMode(map: L.Map) {
    if (clickHandler) {
        map.off('click', clickHandler)
        clickHandler = null
    }
}
