<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { findPointLocation } from '@/utils/findPointLocation'
import { updateTime } from '@/api/trackApi'

const props = defineProps<{
    point: any | null
    position: { x: number; y: number } | null
    influenceRadius: number
    currentTime: string | null
    timeLimits: {
        min?: string
        max?: string
    }
}>()

const menuEl = ref<HTMLElement | null>(null)

const pos = ref({
    x: props.position!.x,
    y: props.position!.y
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'update-radius', value: number): void
    (e: 'update-time', v: string): void
    (e: 'delete'): void
}>()

const store = useTrackStore()
const radius = ref(props.influenceRadius)
const newTime = ref(props.currentTime ?? '')

const isTimeValid = computed(() => {
    if (!newTime.value) return false

    if (props.timeLimits.min && newTime.value < props.timeLimits.min) {
        return false
    }

    if (props.timeLimits.max && newTime.value > props.timeLimits.max) {
        return false
    }

    return true
})

const isChanged = computed(() => {
    return newTime.value !== props.currentTime
})

function adjustPosition() {
    if (!menuEl.value) return

    const rect = menuEl.value.getBoundingClientRect()
    const padding = 8

    let x = pos.value.x
    let y = pos.value.y

    const vw = window.innerWidth
    const vh = window.innerHeight

    if (rect.right > vw) {
        x = vw - rect.width - padding
    }

    if (rect.bottom > vh) {
        y = vh - rect.height - padding
    }

    if (x < padding) x = padding
    if (y < padding) y = padding

    pos.value = { x, y }
}

watch(radius, v => emit('update-radius', v))

async function applyTime() {
    if (!props.point || !newTime.value) return

    const loc = findPointLocation(store.track, props.point)
    if (!loc) {
        console.warn('Point not found in track')
        return
    }

    if (!isTimeValid.value || !isChanged.value) return

    const base = new Date(props.point.time)
    const [h, m, s] = newTime.value.split(':').map(Number)
    base.setHours(h, m, s ?? 0, 0)

    const res = await updateTime({
        session_id: store.sessionId!,
        segment_idx: loc.segment_idx,
        point_idx: loc.point_idx,
        new_time: base.toISOString()
    })

    store.track = res.track
    emit('close')
}

onMounted(async () => {
    await nextTick()
    adjustPosition()
})

watch(
    () => props.position,
    async (p) => {
        if (!p) return
        pos.value = {
            x: props.position!.x + 10,
            y: props.position!.y + 10
        }
        await nextTick()
        adjustPosition()
    }
)

watch(
    () => props.point,
    () => {
        newTime.value = props.currentTime ?? ''
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
        ref="menuEl"
        class="context-menu"
        :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
        @mousedown.stop
    >
        <label class="field">
            <span>Influence radius: {{ radius }} m</span>
            <input type="range" min="20" max="200" v-model.number="radius" />
        </label>

        <label class="field">
            <span>Update time</span>
            <div class="limits" v-if="timeLimits.min || timeLimits.max">
                Allowed range:
                <span>{{ timeLimits.min ?? '—' }}</span>
                –
                <span>{{ timeLimits.max ?? '—' }}</span>
            </div>
            <input
                type="time"
                step="1"
                v-model="newTime"
                :min="timeLimits.min"
                :max="timeLimits.max"
            />
        </label>

        <button
            :disabled="!isTimeValid || !isChanged"
            @click="applyTime"
        >
            Apply time
        </button>
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

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

</style>