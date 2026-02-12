<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, shallowRef, watch, computed, markRaw } from 'vue'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTrackStore } from '@/store/trackStore'
import { renderTrack } from '@/utils/renderTrack'
import { clearPointMarkers, deletePointMarker, syncPointMarkers, getPointUI, renderHoverMarker } from '@/utils/markers'
import { enableInsertPointMode, disableInsertPointMode } from '@/utils/insertPoint'
import { findPointLocation, findPointById } from '@/utils/findPointLocation'
import { renderNormalizePreview, clearNormalizePreview } from '@/utils/normalizePreview'
import { renderTrimPreview, clearTrimPreview } from '@/utils/trimPreview'
import PointContextMenu from '@/components/PointContextMenu.vue'

const mapEl = ref<HTMLDivElement | null>(null)
const map = shallowRef<LeafletMap | null>(null)
const store = useTrackStore()

const spacePressed = ref(false)

const contextPointId = ref<number | null>(null)

const contextPoint = computed(() => {
    if (!store.track || contextPointId.value == null) return null
    return findPointById(store.track, contextPointId.value)
})

const contextPos = ref<{ x: number; y: number }>({ x: 0, y: 0 })

const contextRadius = ref(50)

function onGlobalClick(e: MouseEvent) {
    if (contextPointId.value == null) return

    const menuEl = document.querySelector('.context-menu')
    if (menuEl && menuEl.contains(e.target as Node)) {
        return
    }

    closeContextMenu()
}

onMounted(() => {
    if (!mapEl.value) return

    const leafletMap = L.map(mapEl.value, {
        zoomControl: false,
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: false
    }).setView([20, 0], 3)

    map.value = markRaw(leafletMap)

    L.control.zoom({
        position: 'topright'
    }).addTo(leafletMap)

    L.control.scale({
        position: 'bottomright',
        metric: true,
        imperial: false
    }).addTo(map.value)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap)

    document.addEventListener('mousedown', onGlobalClick)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

})

onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onGlobalClick)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
})

function openContextMenu(point: any, e: MouseEvent) {
    contextPointId.value = point.id
    contextPos.value = {
        x: e.clientX,
        y: e.clientY
    }

    const ui = getPointUI(point.id)
    contextRadius.value = ui?.influenceRadius ?? 50
}

function closeContextMenu() {
    contextPointId.value = null
    contextPos.value = null
}

function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
        e.preventDefault()
        if (!spacePressed.value) {
            spacePressed.value = true
            disableInsertPointMode(map.value!)
        }
    }

    if (e.key === 'Escape') {
        closeContextMenu()
    }
}

function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
        spacePressed.value = false

        if (store.insertMode && map.value) {
            enableInsertPointMode(map.value, openContextMenu)
        }
    }
}

function onDeleteMarker() {
    if (!map.value || contextPointId.value == null) return

    deletePointMarker(map.value, contextPointId.value)
    closeContextMenu()
}

function onUpdateRadius(value: number) {
    contextRadius.value = value

    if (contextPointId.value != null) {
        const ui = getPointUI(contextPointId.value)
        if (ui) {
            ui.influenceRadius = value
        }
    }
}

function toHHMMSS(date: Date): string {
    return [
        date.getHours().toString().padStart(2, '0'),
        date.getMinutes().toString().padStart(2, '0'),
        date.getSeconds().toString().padStart(2, '0')
    ].join(':')
}

function getTimeLimits(point: any) {
    if (!store.track || !point) return {}
    const loc = findPointLocation(store.track, point)
    if (!loc) return {}

    const { segment, index } = loc
    const limits: any = {}

    if (index > 0) {
        limits.min = toHHMMSS(new Date(segment.points[index - 1].time))
    }

    if (index < segment.points.length - 1) {
        limits.max = toHHMMSS(new Date(segment.points[index + 1].time))
    }
    return limits
}

function getPointTime(point: any): string | null {
    if (!point?.time) return null

    const d = new Date(point.time)

    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    const ss = d.getSeconds().toString().padStart(2, '0')

    return `${hh}:${mm}:${ss}`
}

watch(
    () => store.track,
    (track) => {
        if (!track || !map.value) return
        syncPointMarkers(map.value, track)
        if (store.lastUpdate === 'reset') {
            clearPointMarkers(map.value)
            store.lastUpdate = null
        }
        const preserveView =
            store.lastUpdate === 'add_point' ||
            store.lastUpdate === 'reroute' ||
            store.lastUpdate === 'update_time' ||
            store.lastUpdate === 'undo' ||
            store.lastUpdate === 'redo'
        renderTrack(map.value, track, { preserveView })
        store.lastUpdate = null
    },
    { immediate: true }
)

watch(
    [() => store.editorMode, () => spacePressed.value],
    ([mode, paused]) => {
        if (!map.value) return

        const container = map.value.getContainer()

        disableInsertPointMode(map.value)
        container.classList.remove('insert-mode')
        container.classList.remove('insert-paused')

        if (mode === 'insert') {
            container.classList.add('insert-mode')

            if (paused) {
                container.classList.add('insert-paused')
            } else {
                enableInsertPointMode(map.value, openContextMenu)
            }
        }
    },
    { immediate: true }
)

watch(
    () => store.normalizePreview,
    (preview) => {
        if (!map.value) return

        if (!preview) {
            clearNormalizePreview(map.value)
            return
        }

        renderNormalizePreview(map.value, store.track, preview)
    }
)

watch(
    () => [store.editorMode, store.trim.startId, store.trim.endId],
    ([mode, startId, endId]) => {
        if (!map.value) return

        clearTrimPreview(map.value)

        if (mode !== 'trim') return
        if (!startId || !endId) return

        renderTrimPreview(
            map.value,
            store.track,
            startId,
            endId
        )
    },
    { immediate: true }
)

watch(
    () => [store.editorMode, store.recalc.startId, store.recalc.endId],
    ([mode, startId, endId]) => {
        if (!map.value) return

        clearTrimPreview(map.value)

        if (mode !== 'recalc') return
        if (!startId || !endId) return

        renderTrimPreview(
            map.value,
            store.track,
            startId,
            endId
        )
    },
    { immediate: true }
)

watch(
    () => store.hoverPoint,
    (p) => {
        if (!map.value) return
        renderHoverMarker(map.value, p)
    }
)

</script>

<template>
    <div ref="mapEl" class="map"></div>

    <PointContextMenu
        v-if="contextPoint"
        :point="contextPoint"
        :position="contextPos"
        :influence-radius="contextRadius"
        :current-time="getPointTime(contextPoint)"
        :time-limits="getTimeLimits(contextPoint)"
        @update-radius="onUpdateRadius"
        @delete="onDeleteMarker"
        @close="closeContextMenu"
    />
</template>

<style scoped>
.map {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    z-index: 0;
}

.map.insert-paused {
    cursor: grab;
}
.map.insert-paused:active {
    cursor: grabbing;
}

</style>
