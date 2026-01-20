<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { buildProfile } from '@/utils/buildProfile'

const store = useTrackStore()

/* ---------- layout ---------- */

const container = ref<HTMLDivElement | null>(null)
const chartEl = ref<HTMLDivElement | null>(null)

const width = ref(0)
const height = 120
const paddingTop = 10
const paddingBottom = 20

let ro: ResizeObserver | null = null

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

function yScale(ele: number) {
    const range = maxEle.value - minEle.value || 1
    return (
        height -
        paddingBottom -
        ((ele - minEle.value) / range) *
        (height - paddingTop - paddingBottom)
    )
}

/* ---------- area polygon ---------- */

const areaPoints = computed(() => {
    if (!profile.value.length || width.value === 0) return ''

    const top = profile.value.map(p => {
        const x = (p.distKm / totalDistanceKm.value) * width.value
        const y = yScale(p.ele)
        return `${x},${y}`
    })

    const bottom = [
        `${width.value},${height - paddingBottom}`,
        `0,${height - paddingBottom}`
    ]

    return [...top, ...bottom].join(' ')
})

/* ---------- hover interaction ---------- */

const hoverX = ref<number | null>(null)

function onMove(e: MouseEvent) {
    if (!chartEl.value || !profile.value.length) return

    const rect = chartEl.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    hoverX.value = x

    const ratio = x / rect.width
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
    <div class="profile">
        <!-- LEFT INFO -->
        <div class="info">
            <div><strong>Distance</strong> {{ totalDistanceKm.toFixed(2) }} km</div>
            <div v-if="startTime">
                <strong>Start</strong> {{ startTime.toLocaleTimeString() }}
            </div>
            <div v-if="endTime">
                <strong>Finish</strong> {{ endTime.toLocaleTimeString() }}
            </div>
            <div>
                <strong>↑</strong> {{ elevationStats.gain.toFixed(0) }} m
                &nbsp;
                <strong>↓</strong> {{ elevationStats.loss.toFixed(0) }} m
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
                        x1="0"
                        :y1="yScale(v)"
                        :x2="width"
                        :y2="yScale(v)"
                    />
                </g>

                <!-- area -->
                <polygon :points="areaPoints" fill="#ddd" />

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
                    :style="{ left: (d / totalDistanceKm) * 100 + '%' }"
                >
                    {{ d.toFixed(1) }} km
                </span>
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
}

.info {
    width: 180px;
    padding: 8px;
    font-size: 12px;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.chart {
    position: relative;
    flex: 1;
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
</style>
