<script setup lang="ts">
import { useTrackStore } from '@/store/trackStore'

const store = useTrackStore()

function toggleNormalize() {
    store.normalizeOpen = !store.normalizeOpen
}
</script>

<template>
    <div id="sidebar">
        <button
            class="tool-btn"
            :disabled="!store.track"
            :class="{ active: store.editorMode === 'normalize' }"
            @click="store.setEditorMode('normalize')"
            title="Detect GPS stucks and normalize the track"
        >
            N
        </button>

        <button
            class="tool-btn"
            :disabled="!store.track"
            :class="{ active: store.editorMode === 'insert' }"
            @click="store.setEditorMode('insert')"
            title="Insert a point and edit the track"
        >
            ✏️
        </button>
    </div>
</template>


<style scoped>
#sidebar {
    position: absolute;
    top: 50%;
    left: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 1000;
}

.tool-btn {
    width: 40px;
    height: 40px;
    padding: 8px 10px;
}

.tool-btn:hover {
    background: #e0e0e0;
}

.tool-btn.active {
    background: #d1d1d1;
}
</style>