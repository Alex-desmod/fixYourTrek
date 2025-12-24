import L from 'leaflet'
import startSvg from '@/assets/icons/start.svg?raw'
import finishSvg from '@/assets/icons/finish.svg?raw'

export const pointIcon = L.divIcon({
  className: 'point-marker',
  html: '<div class="point-marker__inner"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
})

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
