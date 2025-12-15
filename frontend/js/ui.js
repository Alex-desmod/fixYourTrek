export function initMenu(actions = {}) {
    const menuItems = document.querySelectorAll("#top-menu .menu-item");

    menuItems.forEach(item => {
        const button = item.querySelector(".top-menu-btn");

        button.addEventListener("click", e => {
            e.stopPropagation();

            menuItems.forEach(i => {
                if (i !== item) i.classList.remove("open");
            });
            item.classList.toggle("open");
        });
    });

    document.querySelectorAll("#top-menu .submenu button")
        .forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();

                const action = btn.dataset.action;
                if (action && actions[action]) {
                    actions[action]();
                }

                menuItems.forEach(i => i.classList.remove("open"));
            });
        });

    document.addEventListener("click", () => {
        menuItems.forEach(i => i.classList.remove("open"));
    });
}


export function initEditButton(onToggle) {
    const btn = document.getElementById("btn-edit-tool");
    const mapEl = document.getElementById("map");

    let active = false;

    btn.addEventListener("click", () => {
        active = !active;

        btn.classList.toggle("active", active);
        mapEl.classList.toggle("add-point-mode", active);

        onToggle(active);
    });
}
