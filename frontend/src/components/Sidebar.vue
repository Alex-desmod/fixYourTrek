<script setup lang="ts">
</script>


<template>
    <div id="sidebar">
        <button class="tool-btn" title="Insert a point and edit the track">✏️</button>
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
</style>