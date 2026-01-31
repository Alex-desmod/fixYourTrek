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

function onKeyDown(e: KeyboardEvent) {
    // Windows / Linux
    if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        openFile()
    }

    // macOS (Cmd+O)
    if (e.metaKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        openFile()
    }
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
                    <img :src="exportIcon" class="icon" />
                    Export…
                </button>
            </div>
        </div>

        <div class="menu-item">
            <button class="top-menu-btn" @click.stop="toggle('edit')">Edit</button>
            <div class="submenu" v-show="openMenu === 'edit'">
                <button class="submenu-btn" @click="onUndo">
                    <img :src="undoIcon" class="icon" />
                    Undo
                </button>
                <button class="submenu-btn" @click="onRedo">
                    <img :src="redoIcon" class="icon" />
                    Redo
                </button>
                <button class="submenu-btn" @click="onReset">
                    <img :src="resetIcon" class="icon" />
                    Reset
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
    gap: 8px;
}

.submenu .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    opacity: 0.7;
}

.icon img {
    width: 18px;
    height: 18px;
    display: block;
}

.submenu .shortcut {
    font-size: 12px;
    color: #888;
    opacity: 0.7;
    pointer-events: none;
}

</style>