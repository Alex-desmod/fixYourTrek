<script setup lang="ts">
import { uploadTrack, exportTrack } from '@/api/trackApi'
import { undo, redo, reset } from '@/api/historyApi'
import { useTrackStore } from '@/store/trackStore'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import fileIcon from '@/assets/icons/file.svg'
import exportIcon from '@/assets/icons/export.svg'
import undoIcon from '@/assets/icons/undo.svg'
import redoIcon from '@/assets/icons/redo.svg'
import resetIcon from '@/assets/icons/reset.svg'

type Menu = 'file' | 'edit' | null
const openMenu = ref<Menu>(null)

function toggle(menu: Menu) {
    openMenu.value = openMenu.value === menu ? null : menu
}

function close() {
    openMenu.value = null
}

function onClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('#top-menu')) {
        close()
    }
}

onMounted(() => {
    document.addEventListener('click', onClickOutside),
    document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', onClickOutside),
    document.removeEventListener('keydown', onKeyDown)
})

const store = useTrackStore()
const fileInput = ref<HTMLInputElement | null>(null)

const defaultName = computed(() => {
    return store.track?.metadata?.name || 'track'
})

/* File → Open… */
function openFile() {
    fileInput.value?.click()
}


/* choose a file */
async function onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return

    try {
        const result = await uploadTrack(input.files[0])
        store.setSession(result.session_id, result.track, 'upload')
    } catch (err) {
        console.error('Upload failed', err)
        alert('Failed to upload track')
    } finally {
        input.value = '' // to upload the same file once again
        close()
    }
}

async function onUndo() {
    if (!store.sessionId) return

    try {
        const res = await undo(store.sessionId)
        store.setTrack(res.track, 'undo')
    } catch (e) {
        console.error('Undo failed', e)
    }
}

async function onRedo() {
    if (!store.sessionId) return

    try {
        const res = await redo(store.sessionId)
        store.setTrack(res.track, 'redo')
    } catch (e) {
        console.error('Redo failed', e)
    }
}

async function onReset() {
    if (!store.sessionId) return

    if (!confirm('Reset all changes?')) return

    try {
        const res = await reset(store.sessionId)
        store.setTrack(res.track, 'reset')
    } catch (e) {
        console.error('Reset failed', e)
    }
}

async function onExport() {
    if (!store.sessionId) return

    try {
        const filename = `${defaultName.value}.gpx`

        const blob = await exportTrack({
            session_id: store.sessionId,
            name: defaultName.value || 'track',
            fmt: 'gpx'
        })

        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.style.display = 'none'

        document.body.appendChild(a)
        a.click()

        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (e) {
        console.error(e)
        alert('Export failed')
    }
}

function isCtrlOrCmd(e: KeyboardEvent) {
    return e.ctrlKey || e.metaKey
}

function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return

    const key = e.key.toLowerCase()

    // Open
    if (isCtrlOrCmd(e) && key === 'o') {
        e.preventDefault()
        openFile()
        return
    }

    // Export
    if (isCtrlOrCmd(e) && key === 's') {
        if (!store.track) return
        e.preventDefault()
        onExport()
        return
    }

    // Redo (Ctrl+Shift+Z / Cmd+Shift+Z)
    if (isCtrlOrCmd(e) && e.shiftKey && key === 'z') {
        if (!store.track) return
        e.preventDefault()
        onRedo()
        return
    }

    // Undo
    if (isCtrlOrCmd(e) && key === 'z') {
        if (!store.track) return
        e.preventDefault()
        onUndo()
        return
    }

    // Reset
    if (isCtrlOrCmd(e) && key === 'backspace') {
        if (!store.track) return
        e.preventDefault()
        onReset()
        return
    }
}

</script>

<template>
    <div id="top-menu">
        <div class="menu-item">
            <button class="top-menu-btn" @click.stop="toggle('file')">File</button>
            <div class="submenu" v-show="openMenu === 'file'">
                <button
                    class="submenu-btn"
                    @click.stop="openFile"
                >
                    <span class="left">
                        <span class="icon"><img :src="fileIcon" /></span>
                        <span class="label">Open…</span>
                    </span>
                    <span class="shortcut">Ctrl+O</span>
                </button>

                <button
                    class="submenu-btn"
                    :disabled="!store.track"
                    @click="onExport"
                >
                    <span class="left">
                        <span class="icon"><img :src="exportIcon" /></span>
                        <span class="label">Export…</span>
                    </span>
                    <span class="shortcut">Ctrl+S</span>
                </button>
            </div>
        </div>

        <div class="menu-item">
            <button class="top-menu-btn" @click.stop="toggle('edit')">Edit</button>
            <div class="submenu" v-show="openMenu === 'edit'">
                <button
                    class="submenu-btn"
                    :disabled="!store.track"
                    @click="onUndo"
                >
                    <span class="left">
                        <span class="icon"><img :src="undoIcon" /></span>
                        <span class="label">Undo</span>
                    </span>
                    <span class="shortcut">Ctrl+Z</span>
                </button>

                <button
                    class="submenu-btn"
                    :disabled="!store.track"
                    @click="onRedo"
                >
                    <span class="left">
                        <span class="icon"><img :src="redoIcon" /></span>
                        <span class="label">Redo</span>
                    </span>
                    <span class="shortcut">Ctrl+Shift+Z</span>
                </button>

                <button
                    class="submenu-btn"
                    :disabled="!store.track"
                    @click="onReset"
                >
                    <span class="left">
                        <span class="icon"><img :src="resetIcon" /></span>
                        <span class="label">Reset</span>
                    </span>
                    <span class="shortcut">Ctrl+⌫</span>
                </button>
            </div>
        </div>

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
#top-menu {
    position: absolute;
    width: 50%;
    height: 40px;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 16px;
    background: rgba(255,255,255,0.8);
    justify-content: center;
    align-items: center;
    pointer-events: none;
    border-radius: 8px;
    z-index: 1000;
}

.menu-item {
    position: relative;
}

.top-menu-btn {
    padding: 6px 6px;
    pointer-events: auto;
    background: transparent;
    border: none;
}

.top-menu-btn:hover {
    background: #e0e0e0;
}

.top-menu-btn:active {
    background: #d1d1d1;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
}

.submenu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 6px;
    background: rgba(255,255,255,0.8);
    text-align: left;
    z-index: 1100;
}

.submenu-btn {
    pointer-events: auto;
    min-width: 160px;
    font-weight: 400;
    padding: 6px 12px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    transition: background 0.15s ease;
}

.submenu-btn:hover {
    background: #eee;
}

.submenu-btn .left {
    display: flex;
    align-items: center;
    gap: 6px;
}

.submenu .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.icon img {
    width: 18px;
    height: 18px;
    display: block;
    opacity: 0.8;
}

.submenu-btn:disabled .icon img {
    opacity: 0.5;
}

.submenu .shortcut {
    font-size: 12px;
    color: #888;
    opacity: 0.7;
    pointer-events: none;
}

</style>