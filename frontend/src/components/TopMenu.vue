<script setup lang="ts">
import { uploadTrack } from '@/api/trackApi'
import { useTrackStore } from '@/store/trackStore'
import { ref, onMounted, onBeforeUnmount } from 'vue'

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
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})

const store = useTrackStore()
const fileInput = ref<HTMLInputElement | null>(null)

/* File → Open… */
function onOpenClick() {
  fileInput.value?.click()
}

/* choose a file */
async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  try {
    const result = await uploadTrack(input.files[0])
    store.setSession(result.session_id, result.track)
  } catch (err) {
    console.error('Upload failed', err)
    alert('Failed to upload track')
  } finally {
    input.value = '' // to upload the same file once again
    close()
  }
}

</script>


<template>
    <div id="top-menu">
        <div class="menu-item">
            <button class="top-menu-btn" @click.stop="toggle('file')">File</button>
            <div class="submenu" v-show="openMenu === 'file'">
                <button class="submenu-btn" @click.stop="onOpenClick">Open…</button>
                <button class="submenu-btn">Export…</button>
            </div>
        </div>

        <div class="menu-item">
            <button class="top-menu-btn" @click.stop="toggle('edit')">Edit</button>
            <div class="submenu" v-show="openMenu === 'edit'">
                <button class="submenu-btn">Undo</button>
                <button class="submenu-btn">Redo</button>
                <button class="submenu-btn">Reset</button>
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
    background: #eee;
}

.top-menu-btn:active {
    background: #e6e6e6;
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
    font-weight: 400;
    padding: 6px 12px;
    background: transparent;
    border: none;
    transition: background 0.15s ease;
}

.submenu-btn:hover {
    background: #eee;
}

</style>