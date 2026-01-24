<script setup lang="ts">
import { computed } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { trimTrack } from '@/api/trackApi'

const store = useTrackStore()

const points = computed(() =>
    store.track
        ? store.track.segments.flatMap(s => s.points)
        : []
)

const min = 0
const max = points.value.length - 1

function onTrim() {
    if (!store.sessionId) return

    trimTrack({
        session_id: store.sessionId,
        start_point_id: store.trim.startId,
        finish_point_id: store.trim.endId
    }).then(res => {
        store.setTrack(res.track, 'trim')
        store.setEditorMode(null)
    })
}
</script>

<template>
<div class="trim-menu">
    <label>
        Start
        <input
            type="range"
            :min="0"
            :max="max"
            v-model.number="store.trim.startId"
        />
    </label>

    <label>
        Finish
        <input
            type="range"
            :min="0"
            :max="max"
            v-model.number="store.trim.endId"
        />
    </label>

    <button
        :disabled="store.trim.startId >= store.trim.endId"
        @click="onTrim"
    >
        Trim
    </button>
</div>
</template>
