<script setup lang="ts">
import { useTrackStore } from '@/store/trackStore'
import NormalizeMenu from '@/components/NormalizeMenu.vue'
import TrimMenu from '@/components/TrimMenu.vue'

const store = useTrackStore()

function toggleNormalize() {
    store.normalizeOpen = !store.normalizeOpen
}
</script>

<template>
    <div id="sidebar">
        <div class="tool-wrapper">
            <button
                class="tool-btn"
                :disabled="!store.track"
                :class="{ active: store.editorMode === 'normalize' }"
                @click="store.setEditorMode('normalize')"
                title="Detect GPS stucks and normalize the track"
            >
                N
            </button>

            <NormalizeMenu
                v-if="store.editorMode === 'normalize'"
                class="mode-menu"
            />
        </div>

        <button
            class="tool-btn"
            :disabled="!store.track"
            :class="{ active: store.editorMode === 'insert' }"
            @click="store.setEditorMode('insert')"
            title="Insert a point and edit the track"
        >
            ✏️
        </button>

        <div class="tool-wrapper">
            <button
                class="tool-btn"
                :disabled="!store.track"
                :class="{ active: store.editorMode === 'trim' }"
                @click="store.setEditorMode('trim')"
                title="Trim the track"
            >
                T
            </button>

            <TrimMenu
                v-if="store.editorMode === 'trim'"
                class="mode-menu"
            />
        </div>
    </div>
</template>


<style scoped>
#sidebar {
    position: fixed;
    top: 40%;
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

.tool-wrapper {
    position: relative;
}

.mode-menu {
    position: absolute;
    left: 48px;
    top: 0;
    z-index: 1000;
}

@media (max-width: 768px) {
    .tool-btn {
        width: 42px;
        height: 42px;
        font-size: 18px;
    }
}
</style>