<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { updateTime } from '@/api/trackApi'

const props = defineProps<{
    point: any | null
    position: { x: number; y: number } | null
    influenceRadius: number
    currentTime: string | null
    timeLimits: {
        min: string | null
        max: string | null
    }
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'update-radius', value: number): void
    (e: 'update-time', v: string): void
    (e: 'delete'): void
}>()

const store = useTrackStore()
const radius = ref(props.influenceRadius)
const newTime = ref(props.currentTime)

watch(radius, v => emit('update-radius', v))

async function applyTime() {
    if (!props.point || !newTime.value) return

    const base = new Date(props.point.time)
    const [h, m, s] = newTime.value.split(':').map(Number)

    base.setHours(h, m, s ?? 0, 0)

    const res = await updateTime({
        session_id: store.sessionId!,
        segment_idx: props.point.segment_idx,
        point_idx: props.point.point_idx,
        new_time: base.toISOString()
    })

    store.track = res.track
    emit('close')
}

watch(
    () => props.point,
    () => {
        newTime.value = props.currentTime
        radius.value = props.influenceRadius
    },
    { immediate: true }
)

function onDelete() {
    emit('delete')
    emit('close')
}
</script>

<template>
    <div
        class="context-menu"
        :style="{ left: position!.x + 'px', top: position!.y + 'px' }"
        @mousedown.stop
    >
        <label>
            Influence radius: {{ radius }} m
            <input
                type="range"
                min="20"
                max="200"
                v-model.number="radius"
            />
        </label>

        <label>
            Update time
            <input
                type="time"
                step="1"
                v-model="newTime"
                :min="timeLimits.min"
                :max="timeLimits.max"
            />
        </label>

        <button @click="applyTime">Apply time</button>
        <button class="danger" @click="onDelete">Delete</button>
    </div>
</template>

<style scoped>
.context-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;

    position: fixed;
    z-index: 5000;
    background: white;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
}

</style>