<script setup lang="ts">
import { onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map

onMounted(() => {
  if (!mapEl.value) return

  map = L.map(mapEl.value, {
    zoomControl: false
  }).setView([20, 0], 3)

  L.control.zoom({
    position: 'topright'
  }).addTo(map)

  L.control.scale({
    position: 'bottomright',
    metric: true,
    imperial: false
  }).addTo(map)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)
})
</script>

<template>
  <div ref="mapEl" class="map"></div>
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
}
</style>
