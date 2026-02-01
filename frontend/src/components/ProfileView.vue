<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { buildProfile } from '@/utils/buildProfile'
import distanceIcon from '@/assets/icons/distance.svg'
import timeIcon from '@/assets/icons/time.svg'
import elevationIcon from '@/assets/icons/elevation.svg'

const store = useTrackStore()

/* ---------- layout ---------- */

const container = ref<HTMLDivElement | null>(null)
const chartEl = ref<HTMLDivElement | null>(null)

const width = ref(0)
const height = 120
const paddingTop = 10
const paddingBottom = 20

let ro: ResizeObserver | null = null

const collapsed = ref(false)

function toggle() {
    collapsed.value = !collapsed.value
}

onMounted(() => {
    if (!chartEl.value) return

    ro = new ResizeObserver(entries => {
        width.value = entries[0].contentRect.width
    })
    ro.observe(chartEl.value)
})

onBeforeUnmount(() => {
    ro?.disconnect()
})

/* ---------- profile data ---------- */

const profile = computed(() => {
    if (!store.track) return []
    return buildProfile(store.track)
})

const totalDistanceKm = computed(() =>
    profile.value.length ? profile.value.at(-1)!.distKm : 0
)

const minEle = computed(() =>
    Math.min(...profile.value.map(p => p.ele))
)

const maxEle = computed(() =>
    Math.max(...profile.value.map(p => p.ele))
)

const minSpeed = computed(() =>
    Math.min(...profile.value.map(p => p.speed ?? 0))
)

const maxSpeed = computed(() =>
    Math.max(...profile.value.map(p => p.speed ?? 0))
)

/* ---------- elevation stats ---------- */

const elevationStats = computed(() => {
    let gain = 0
    let loss = 0

    for (let i = 1; i < profile.value.length; i++) {
        const d = profile.value[i].ele - profile.value[i - 1].ele
        if (d > 0) gain += d
        else loss -= d
    }

    return { gain, loss }
})

const startTime = computed(() => {
    const p = profile.value[0]?.point
    return p?.time ? new Date(p.time) : null
})

const endTime = computed(() => {
    const p = profile.value.at(-1)?.point
    return p?.time ? new Date(p.time) : null
})

/* ---------- scales ---------- */

const LEFT_PAD = 50          // for the heigth scale
const RIGHT_PAD_RATIO = 0.05 // 10% from the right

const drawWidth = computed(() => {
    return Math.max(0, width.value * (1 - RIGHT_PAD_RATIO) - LEFT_PAD)
})

function xScale(distKm: number) {
    if (!totalDistanceKm.value) return LEFT_PAD
    return LEFT_PAD + (distKm / totalDistanceKm.value) * drawWidth.value
}

function niceStep(range: number, target: number) {
    const raw = range / target
    const pow = Math.pow(10, Math.floor(Math.log10(raw)))
    const n = raw / pow

    if (n < 1.5) return 1 * pow
    if (n < 3) return 2 * pow
    if (n < 7) return 5 * pow
    return 10 * pow
}

const yTicks = computed(() => {
    const step = niceStep(maxEle.value - minEle.value, 5)
    const ticks = []
    for (
        let v = Math.floor(minEle.value / step) * step;
        v <= maxEle.value;
        v += step
    ) {
        ticks.push(v)
    }
    return ticks
})

const xTicks = computed(() => {
    const step = niceStep(totalDistanceKm.value, 6)
    const ticks = []
    for (let d = 0; d <= totalDistanceKm.value; d += step) {
        ticks.push(d)
    }
    return ticks
})

const speedTicks = computed(() => {
    const step = niceStep(maxSpeed.value - minSpeed.value, 5)
    const ticks = []

    for (
        let v = Math.floor(minSpeed.value / step) * step;
        v <= maxSpeed.value;
        v += step
    ) {
        ticks.push(v)
    }

    return ticks
})


function yScale(ele: number) {
    const range = maxEle.value - minEle.value || 1
    return (
        height -
        paddingBottom -
        ((ele - minEle.value) / range) *
        (height - paddingTop - paddingBottom)
    )
}

function speedY(speed: number) {
    const min = minSpeed.value
    const max = maxSpeed.value || min + 1

    return (
        height -
        paddingBottom -
        ((speed - min) / (max - min)) *
        (height - paddingTop - paddingBottom)
    )
}

/* ---------- area polygon and polyline ---------- */

const areaPoints = computed(() => {
    if (!profile.value.length || width.value === 0) return ''

    const top = profile.value.map(p => {
        const x = xScale(p.distKm)
        const y = yScale(p.ele)
        return `${x},${y}`
    })

    const bottom = [
        `${LEFT_PAD + drawWidth.value},${height - paddingBottom}`,
        `${LEFT_PAD},${height - paddingBottom}`
    ]

    return [...top, ...bottom].join(' ')
})

const speedLine = computed(() => {
    if (!profile.value.length || width.value === 0) return ''

    return profile.value
        .map(p => {
            const x = xScale(p.distKm)
            const y = speedY(p.speed ?? 0)
            return `${x},${y}`
        })
        .join(' ')
})

const trim = computed(() => store.trim)

const trimRange = computed(() => {
    if (!trim.value.startId || !trim.value.endId) return null

    const startIdx = profile.value.findIndex(
        p => p.point.id === trim.value.startId
    )
    const endIdx = profile.value.findIndex(
        p => p.point.id === trim.value.endId
    )

    if (startIdx === -1 || endIdx === -1) return null
    if (startIdx >= endIdx) return null

    return { startIdx, endIdx }
})

const trimBeforeArea = computed(() => {
    if (!trimRange.value || width.value === 0) return ''

    const pts = profile.value.slice(0, trimRange.value.startIdx + 1)

    return buildAreaPolygon(pts)
})

const trimAfterArea = computed(() => {
    if (!trimRange.value || width.value === 0) return ''

    const pts = profile.value.slice(trimRange.value.endIdx)

    return buildAreaPolygon(pts)
})

function buildAreaPolygon(pts: ProfilePoint[]) {
    if (!pts.length) return ''

    const top = pts.map(p => {
        const x = LEFT_PAD + (p.distKm / totalDistanceKm.value) * drawWidth.value
        const y = yScale(p.ele)
        return `${x},${y}`
    })

    const bottom = [
        `${LEFT_PAD + (pts.at(-1)!.distKm / totalDistanceKm.value) * drawWidth.value},${height - paddingBottom}`,
        `${LEFT_PAD + (pts[0].distKm / totalDistanceKm.value) * drawWidth.value},${height - paddingBottom}`
    ]

    return [...top, ...bottom].join(' ')
}


/* ---------- hover interaction ---------- */

const hoverX = ref<number | null>(null)

function onMove(e: MouseEvent) {
    if (!chartEl.value || !profile.value.length) return

    const rect = chartEl.value.getBoundingClientRect()
    const rawX = e.clientX - rect.left

    // limit of cursor moving by the  working area
    const clampedX = Math.min(
        LEFT_PAD + drawWidth.value,
        Math.max(LEFT_PAD, rawX)
    )

    hoverX.value = clampedX

    const ratio =
        (clampedX - LEFT_PAD) / drawWidth.value

    const targetDist = ratio * totalDistanceKm.value

    let best = profile.value[0]
    let bestDiff = Infinity

    for (const p of profile.value) {
        const d = Math.abs(p.distKm - targetDist)
        if (d < bestDiff) {
            best = p
            bestDiff = d
        }
    }

    store.setHoverPoint(best.point)
}

function onLeave() {
    hoverX.value = null
    store.setHoverPoint(null)
}
</script>

<template>
    <div class="profile" :class="{ collapsed }">
        <div class="header" @click="toggle">
            <span class="chevron">
                {{ collapsed ? '▲' : '▼' }}
            </span>
        </div>
        <div class="content">
            <!-- LEFT INFO -->
            <div class="info">
                <div class="stats">
                    <span class="icon"><img :src="distanceIcon" /></span>
                    <span class="data">{{ totalDistanceKm.toFixed(2) }} km</span>
                </div>
                <div v-if="startTime" class="stats">
                    <span class="icon"><img :src="timeIcon" /></span>
                    <span class="data">{{ startTime.toLocaleTimeString() }} / {{ endTime.toLocaleTimeString() }}</span>
                </div>
                <div class="stats">
                    <span class="icon"><img :src="elevationIcon" /></span>
                    <span class="data">
                        <strong>↑</strong> {{ elevationStats.gain.toFixed(0) }} m / <strong>↓</strong> {{ elevationStats.loss.toFixed(0) }} m
                    </span>
                </div>
            </div>

            <!-- CHART -->
            <div
                ref="chartEl"
                class="chart"
                @mousemove="onMove"
                @mouseleave="onLeave"
            >
                <svg :width="width" :height="height">
                    <!-- grid Y -->
                    <g class="grid">
                        <line
                            v-for="v in yTicks"
                            :key="v"
                            :x1="LEFT_PAD"
                            :y1="yScale(v)"
                            :x2="LEFT_PAD + drawWidth"
                            :y2="yScale(v)"
                        />
                    </g>

                    <!-- area -->
                    <polygon :points="areaPoints" fill="#ddd" />

                    <!-- trim preview -->
                    <polygon
                        v-if="trimBeforeArea"
                        :points="trimBeforeArea"
                        fill="red"
                        opacity="0.9"
                    />

                    <polygon
                        v-if="trimAfterArea"
                        :points="trimAfterArea"
                        fill="red"
                        opacity="0.9"
                    />

                    <polyline
                        :points="speedLine"
                        fill="none"
                        stroke="#e53935"
                        stroke-width="2"
                    />

                    <!-- hover line -->
                    <line
                        v-if="hoverX !== null"
                        :x1="hoverX"
                        y1="0"
                        :x2="hoverX"
                        :y2="height"
                        stroke="#808080"
                        stroke-width="1"
                    />
                </svg>

                <!-- X labels -->
                <div class="x-labels">
                    <span
                        v-for="d in xTicks"
                        :key="d"
                        :style="{
                            left:
                                LEFT_PAD +
                                (d / totalDistanceKm) * drawWidth +
                                'px'
                        }"
                    >
                        {{ d.toFixed(1) }} km
                    </span>
                </div>

                <div class="elevation-axis">
                    <div
                        v-for="v in yTicks"
                        :key="v"
                        class="tick"
                        :style="{ top: yScale(v) + 'px' }"
                    >
                        {{ v.toFixed(0) }} m
                    </div>
                </div>

                <div class="speed-axis">
                    <div
                        v-for="v in speedTicks"
                        :key="v"
                        class="tick"
                        :style="{ top: speedY(v) + 'px' }"
                    >
                        {{ v.toFixed(1) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.profile {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    height: 160px;
    background: rgb(255,255,255,0.8);
    border-top: 1px solid #ccc;
    z-index: 2000;
    flex-direction: column;
    transition: height 0.25s ease;
}

.profile.collapsed {
    height: 15px;
}

.header {
    height: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f6f6f6;
    border-bottom: 1px solid #ddd;
    user-select: none;
}

.chevron {
    font-size: 14px;
    color: #555;
}

.content {
    flex: 1;
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.profile.collapsed .content {
    pointer-events: none;
}

.info {
    width: 160px;
    padding: 8px;
    font-size: 12px;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stats {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
}

.stats .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.stats .data {
    white-space: nowrap;
}

.icon img {
    width: 16px;
    height: 16px;
    opacity: 0.8;
}

.chart {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
}

.chart svg {
    display: block;
    width: 100%;
    height: 100%;
}

.grid line {
    stroke: #eee;
    stroke-width: 1;
}

.x-labels {
    position: absolute;
    bottom: 2px;
    left: 0;
    right: 0;
    height: 16px;
}

.x-labels span {
    position: absolute;
    transform: translateX(-50%);
    font-size: 10px;
    color: #666;
}

.elevation-axis {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 44px;
    pointer-events: none;
}

.elevation-axis .tick {
    position: absolute;
    left: 4px;
    transform: translateY(-50%);
    font-size: 10px;
    color: #666;
    white-space: nowrap;
}

.speed-axis {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
}

.speed-axis .tick {
    position: absolute;
    right: 4px;
    transform: translateY(-50%);
    font-size: 10px;
    color: #e53935;
}

@media (max-width: 768px) {
    .info {
        width: 100px;
        font-size: 10px;
        padding: 6px;
    }

    .stats {
        gap: 8px;
    }

    .icon img {
        width: 14px;
        height: 14px;
    }

    .elevation-axis {
        width: 30px;
    }

    .speed-axis {
        width: 30px;
    }
}
</style>
