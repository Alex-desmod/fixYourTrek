<script setup lang="ts">
import MapView from '@/components/MapView.vue'
import TopMenu from '@/components/TopMenu.vue'
import Sidebar from '@/components/Sidebar.vue'
import ProfileView from '@/components/ProfileView.vue'
import { useTrackStore } from '@/store/trackStore'

const store = useTrackStore()
</script>

<template>
    <div id="app">
        <TopMenu />
        <Sidebar />
        <ProfileView v-if="store.track" />
        <MapView />
    </div>
</template>

<style>
.app {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>