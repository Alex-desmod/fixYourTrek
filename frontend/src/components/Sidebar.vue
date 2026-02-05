<script setup lang="ts">
import { useTrackStore } from '@/store/trackStore'
import NormalizeMenu from '@/components/NormalizeMenu.vue'
import TrimMenu from '@/components/TrimMenu.vue'
import MergeMenu from '@/components/MergeMenu.vue'
import RecalcMenu from '@/components/RecalcMenu.vue'
import editIcon from '@/assets/icons/edit.svg'
import trimIcon from '@/assets/icons/trim.svg'
import normalizeIcon from '@/assets/icons/normalize.svg'
import mergeIcon from '@/assets/icons/merge.svg'
import recalcIcon from '@/assets/icons/recalculate.svg'

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
                <span class="icon"><img :src="normalizeIcon" /></span>
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
            <span class="icon"><img :src="editIcon" /></span>
        </button>

        <div class="tool-wrapper">
            <button
                class="tool-btn"
                :disabled="!store.track"
                :class="{ active: store.editorMode === 'recalc' }"
                @click="store.setEditorMode('recalc')"
                title="Recalculate times on the marked section"
            >
                <span class="icon"><img :src="recalcIcon" /></span>
            </button>

            <RecalcMenu
                v-if="store.editorMode === 'recalc'"
                class="mode-menu"
            />
        </div>

        <div class="tool-wrapper">
            <button
                class="tool-btn"
                :disabled="!store.track"
                :class="{ active: store.editorMode === 'trim' }"
                @click="store.setEditorMode('trim')"
                title="Trim the track"
            >
                <span class="icon"><img :src="trimIcon" /></span>
            </button>

            <TrimMenu
                v-if="store.editorMode === 'trim'"
                class="mode-menu"
            />
        </div>

        <div class="tool-wrapper">
            <button
                class="tool-btn"
                :disabled="!store.track"
                :class="{ active: store.editorMode === 'merge' }"
                @click="store.setEditorMode('merge')"
                title="Merge with another track"
            >
                <span class="icon"><img :src="mergeIcon" /></span>
            </button>

            <MergeMenu
                v-if="store.editorMode === 'merge'"
                class="mode-menu"
            />
        </div>
    </div>
</template>


<style scoped>
#sidebar {
    position: fixed;
    top: 35%;
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
    display: flex;
    align-items: center;
    justify-content: center;
}

.tool-btn:hover {
    background: #e0e0e0;
}

.tool-btn.active {
    background: #d1d1d1;
}

.tool-btn .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.icon img {
    width: 24px;
    height: 24px;
    display: block;
    opacity: 0.8;
}

.tool-btn:disabled .icon {
    opacity: 0.5;
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
    #sidebar {
        top: 30%;
    }

    .tool-btn {
        width: 42px;
        height: 42px;
        font-size: 18px;
    }

}
</style>