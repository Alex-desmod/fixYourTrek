<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { flattenTrack } from '@/utils/trimPreview'
import { recalcTimes } from '@/api/trackApi'

const store = useTrackStore()

const flatPoints = computed(() =>
    store.track ? flattenTrack(store.track) : []
)

const maxIdx = computed(() => flatPoints.value.length - 1)

const startIdx = ref(0)
const endIdx = ref(maxIdx.value)

const canRecalc = computed(() =>
    store.track &&
    startIdx.value < endIdx.value
)

const startPointId = computed(
    () => flatPoints.value[startIdx.value]?.id
)

const endPointId = computed(
    () => flatPoints.value[endIdx.value]?.id
)

const selectionStyle = computed(() => {
    const left = (startIdx.value / maxIdx.value) * 100
    const right = (endIdx.value / maxIdx.value) * 100

    return {
        left: left + '%',
        width: (right - left) + '%'
    }
})

const maxDeviation = ref(0.1)


async function applyRecalcTimes() {
    if (!store.sessionId || !startPointId.value || !endPointId.value) return

    const res = await recalcTimes({
        session_id: store.sessionId,
        start_point_id: startPointId.value,
        end_point_id: endPointId.value,
        max_deviation: maxDeviation.value
    })
    store.track = res.track
    store.setEditorMode(null)
}


watch(startIdx, v => {
    if (v >= endIdx.value) {
        startIdx.value = endIdx.value - 1
    }
})

watch(endIdx, v => {
    if (v <= startIdx.value) {
        endIdx.value = startIdx.value + 1
    }
})

watch(
    [startPointId, endPointId],
    ([startId, endId]) => {
        store.recalc.startId = startId ?? null
        store.recalc.endId = endId ?? null
    },
    { immediate: true }
)

</script>

<template>
<div class="recalc-menu">
    <div class="range-wrap">
        <div class="range-track"></div>
        <div
            class="range-selection"
            :style="selectionStyle"
        ></div>

        <input
            type="range"
            :min="0"
            :max="maxIdx"
            v-model.number="startIdx"
            class="thumb thumb-left"
        />

        <input
            type="range"
            :min="0"
            :max="maxIdx"
            v-model.number="endIdx"
            class="thumb thumb-right"
        />
    </div>

    <label class="field">
        <span>Max deviation: {{ maxDeviation.toFixed(2) }}</span>
        <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.1"
            v-model.number="maxDeviation"
        />
    </label>

    <button
        :disabled="!canRecalc"
        @click="applyRecalcTimes"
    >
        Recalculate times
    </button>

</div>
</template>

<style scoped>
.recalc-menu {
    position: absolute;
    left: 56px;
    top: 120px;
    width: 250px;
    z-index: 3000;
    background: white;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.range-wrap {
    position: relative;
    height: 32px;
    width: 100%;
}

.range-wrap input {
    position: absolute;
    height: 32px;
    width: 100%;
    left: 0;
    top: 0;
    margin: 0;
    background: none;
    pointer-events: none;
    -webkit-appearance: none;
}

.range-wrap input::-webkit-slider-runnable-track {
    background: transparent;
    height: 4px;
}

.range-wrap input::-webkit-slider-thumb {
    pointer-events: all;
    -webkit-appearance: none;
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: #1976d2;
    border: none;
    margin-top: -4px;
    margin-top: calc((4px - 14px) / 2);
}

.range-track,
.range-selection {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    border-radius: 2px;
}

.range-track {
    left: 0;
    right: 0;
    background: #ddd;
}

.range-selection {
    background: #1976d2;
}

</style>