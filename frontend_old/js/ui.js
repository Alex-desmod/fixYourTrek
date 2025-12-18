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


const menu = document.getElementById("marker-context-menu");
const radiusInput = menu.querySelector("input[type=range]");
const radiusValue = menu.querySelector(".radius-value");

let currentContext = null;

export function showMarkerContextMenu(x, y, context) {
    currentContext = context;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove("hidden");

    radiusInput.value = context.radius_m;
    radiusValue.textContent = context.radius_m;
}

export function hideMarkerContextMenu() {
    menu.classList.add("hidden");
    currentContext = null;
}

radiusInput.addEventListener("input", () => {
    const r = Number(radiusInput.value);
    radiusValue.textContent = r;

    if (currentContext) {
        currentContext.radius_m = r;
    }
});

menu.addEventListener("click", e => {
    const action = e.target.dataset.action;
    if (!action || !currentContext) return;

    if (action === "edit-time") {
        currentContext.onEditTime();
        hideMarkerContextMenu();
    }
});

document.addEventListener("click", hideMarkerContextMenu);

const timeEditor = menu.querySelector(".time-editor");
const timeInput = timeEditor.querySelector("input");

menu.addEventListener("click", async e => {
    const action = e.target.dataset.action;
    if (!action || !currentContext) return;

    if (action === "edit-time") {
        timeEditor.classList.remove("hidden");

        // current time of the point
        const d = new Date(currentContext.time);
        timeInput.value = d.toISOString().substring(11, 19);
        return;
    }

    if (action === "apply-time") {
        const [h, m, s] = timeInput.value.split(":").map(Number);

        const d = new Date(currentContext.time);
        d.setHours(h, m, s);

        try {
            await currentContext.onEditTime(d.toISOString());
        } catch (err) {
            alert(err.message);
        }

        timeEditor.classList.add("hidden");
        hideMarkerContextMenu();
    }
});

