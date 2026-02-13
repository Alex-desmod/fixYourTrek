<script setup lang="ts">
import { ref } from 'vue'
import { useTrackStore } from '@/store/trackStore'
import { mergeTrack } from '@/api/trackApi'

const store = useTrackStore()
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)

function pickFile() {
    fileInput.value?.click()
}

async function onFileSelected(e: Event) {
    const files = (e.target as HTMLInputElement).files
    if (!files || !files.length) return

    const file = files[0]
    if (!store.sessionId) return
    if (!file) return

    loading.value = true
    try {
        const res = await mergeTrack({
            session_id: store.sessionId,
            file
        })

        store.track = res.track
        store.lastUpdate = 'merge'
        store.setEditorMode(null)
    } catch (err) {
        console.error('merge failed', err)
        alert('Merge failed')
    } finally {
        loading.value = false
        ;(e.target as HTMLInputElement).value = ''
    }
}
</script>

<template>
    <div class="merge-menu">
        <button
            class="primary"
            :disabled="loading"
            @click="pickFile"
        >
            Add track…
        </button>

        <input
            ref="fileInput"
            type="file"
            accept=".gpx,.fit,.tcx"
            hidden
            @change="onFileSelected"
        />
    </div>
</template>

<style scoped>
.merge-menu {
    position: absolute;
    left: 56px;
    top: 120px;
    min-width: 140px;
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
