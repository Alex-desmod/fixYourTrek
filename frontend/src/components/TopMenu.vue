<script setup lang="ts">
</script>


<template>
    <div id="top-menu">
        <div class="menu-item">
            <button class="top-menu-btn">File</button>
            <div class="submenu">
                <button class="submenu-btn">Open…</button>
                <button class="submenu-btn">Export…</button>
            </div>
        </div>


        <div class="menu-item">
            <button class="top-menu-btn">Edit</button>
            <div class="submenu">
                <button class="submenu-btn">Undo</button>
                <button class="submenu-btn">Redo</button>
                <button class="submenu-btn">Reset</button>
            </div>
        </div>
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
    margin-top: 6px;
    background: rgba(255,255,255,0.8);
    text-align: left;
    display: none;
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

.menu-item:hover .submenu {
    display: block;
}
</style>