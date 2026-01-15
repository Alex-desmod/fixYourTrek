<script setup lang="ts">
import { watch } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { normalizePreview, normalizeApply } from '@/api/normalizeApi'

const store = useTrackStore()

async function loadPreview() {
    if (!store.sessionId) return

    const res = await normalizePreview({
        session_id: store.sessionId,
        max_speed: store.normalizeParams.maxSpeed,
        min_points: store.normalizeParams.minPoints
    })

    store.normalizePreview = res
}

watch(
    () => [store.normalizeParams.maxSpeed, store.normalizeParams.minPoints],
    loadPreview,
    { immediate: true }
)

async function applyNormalize() {
    if (!store.sessionId) return

    const res = await normalizeApply({
        session_id: store.sessionId,
        max_speed: store.normalizeParams.maxSpeed,
        min_points: store.normalizeParams.minPoints
    })

    store.track = res.track
    store.normalizeOpen = false
}
</script>

<template>
    <div class="normalize-menu">
        <label>
            Max speed: {{ store.normalizeParams.maxSpeed }} m/s
            <input
                type="range"
                min="5"
                max="20"
                step="1"
                v-model.number="store.normalizeParams.maxSpeed"
            />
        </label>

        <label>
            Min points: {{ store.normalizeParams.minPoints }}
            <input
                type="range"
                min="5"
                max="20"
                step="1"
                v-model.number="store.normalizeParams.minPoints"
            />
        </label>

        <button class="primary" @click="applyNormalize">
            Normalize
        </button>
    </div>
</template>

<style scoped>
.normalize-menu {
    position: absolute;
    left: 56px;
    top: 120px;
    z-index: 3000;
    background: white;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
