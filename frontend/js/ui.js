export function initMenu(onOpen, onExport) {
    const menu = document.getElementById("menu-file");
    const submenu = document.getElementById("submenu-file");

    menu.addEventListener("click", () => {
        submenu.classList.toggle("hidden");
    });

    document.getElementById("btn-open").onclick = onOpen;
    document.getElementById("btn-export").onclick = onExport;
}

export function initEditButton(onToggle) {
    const btn = document.getElementById("btn-edit");
    const mapEl = document.getElementById("map");

    let active = false;

    btn.addEventListener("click", () => {
        active = !active;

        btn.classList.toggle("active", active);
        mapEl.classList.toggle("add-point-mode", active);

        onToggle(active);
    });
}
