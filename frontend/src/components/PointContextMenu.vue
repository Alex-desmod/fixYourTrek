<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { updateTime } from '@/api/trackApi'

const props = defineProps<{
    point: any | null
    position: { x: number; y: number } | null
    influenceRadius: number
    minTime?: string
    maxTime?: string
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'update-radius', value: number): void
    (e: 'delete'): void
}>()

const store = useTrackStore()
const radius = ref(props.influenceRadius)
const newTime = ref('')

watch(radius, v => emit('update-radius', v))

async function applyTime() {
    if (!props.point || !newTime.value) return

    await updateTime({
        session_id: store.sessionId!,
        segment_idx: props.point.segment_idx,
        point_idx: props.point.point_idx,
        new_time: newTime.value
    })

    emit('close')
}

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
            <input type="range" min="20" max="200" v-model="radius" />
        </label>

        <label>
            Update time
            <input
                type="datetime-local"
                v-model="newTime"
                :min="minTime"
                :max="maxTime"
            />
        </label>

        <button @click="applyTime">Apply time</button>
        <button class="danger" @click="onDelete">Delete</button>
    </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 5000;
  background: white;
  border: 1px solid #ccc;
  pointer-events: auto;
}
</style>