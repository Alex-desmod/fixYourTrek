<script setup lang="ts">
import MapView from '@/components/MapView.vue'
import TopMenu from '@/components/TopMenu.vue'
import Sidebar from '@/components/Sidebar.vue'
</script>

<template>
    <div id="app">
        <MapView />
        <TopMenu />
        <Sidebar />
    </div>
</template>

<style>
.app {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>