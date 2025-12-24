<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTrackStore } from '@/store/trackStore'
import { renderTrack } from '@/utils/renderTrack'
import { enableInsertPointMode, disableInsertPointMode } from '@/utils/insertPoint'

const mapEl = ref<HTMLDivElement | null>(null)
const map = ref<L.Map | null>(null)
const store = useTrackStore()

onMounted(() => {
  if (!mapEl.value) return

  map.value = L.map(mapEl.value, {
    zoomControl: false
  }).setView([20, 0], 3)

  L.control.zoom({
    position: 'topright'
  }).addTo(map.value)

  L.control.scale({
    position: 'bottomright',
    metric: true,
    imperial: false
  }).addTo(map.value)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map.value)
})

watch(
  () => store.track,
  (track) => {
    if (!track || !map.value) return
    renderTrack(map.value, track)
  },
  { immediate: true }
)

watch(
  () => store.insertMode,
  (enabled) => {
    if (!map.value) return
    const container = map.value.getContainer()
    container.classList.toggle('insert-mode', enabled)

    if (enabled) {
      enableInsertPointMode(map.value)
    } else {
      disableInsertPointMode(map.value)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div ref="mapEl" class="map"></div>
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  z-index: 0;
}
</style>
