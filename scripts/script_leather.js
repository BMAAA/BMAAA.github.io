function asset(path) {
  return window.PplBase ? window.PplBase.url(path) : path;
}

const DYE_TEXTURES = {
    white_dye: "/assets/textures/white_dye.webp",
    orange_dye: "/assets/textures/orange_dye.webp",
    magenta_dye: "/assets/textures/magenta_dye.webp",
    light_blue_dye: "/assets/textures/light_blue_dye.webp",
    yellow_dye: "/assets/textures/yellow_dye.webp",
    lime_dye: "/assets/textures/lime_dye.webp",
    pink_dye: "/assets/textures/pink_dye.webp",
    gray_dye: "/assets/textures/gray_dye.webp",
    light_gray_dye: "/assets/textures/light_gray_dye.webp",
    cyan_dye: "/assets/textures/cyan_dye.webp",
    purple_dye: "/assets/textures/purple_dye.webp",
    blue_dye: "/assets/textures/blue_dye.webp",
    brown_dye: "/assets/textures/brown_dye.webp",
    green_dye: "/assets/textures/green_dye.webp",
    red_dye: "/assets/textures/red_dye.webp",
    black_dye: "/assets/textures/black_dye.webp"
};

const COLOR_STORAGE_KEY = "ppl_leather_color";

const container = document.getElementById("results");
const loading = document.getElementById("loading");
const run = document.getElementById("run");

let workerReady = false;
let pendingHex = null;
const leatherWorker = new Worker(asset("/scripts/leather_worker.js"));

leatherWorker.addEventListener("message", (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === "ready") {
        workerReady = true;
        if (pendingHex) {
            const hex = pendingHex;
            pendingHex = null;
            findNearest(hex);
        }
        return;
    }
    if (data.type === "error") {
        loading.classList.add("hidden");
        run.disabled = false;
        return;
    }
    if (data.type === "result") {
        loading.classList.add("hidden");
        renderResults(data.results || []);
        run.disabled = false;
    }
});

function findNearest(hex) {
    run.disabled = true;
    container.innerHTML = "";
    loading.classList.remove("hidden");
    if (!workerReady) {
        pendingHex = hex;
        return;
    }
    leatherWorker.postMessage({ type: "find", hex });
}

function renderResults(results) {
    const container = document.getElementById("results");
    container.innerHTML = "";
    for (const item of results) {
        const div = document.createElement("div");
        div.className = "result";
        const textures = item.combo.map(dye =>`<img class="dye" src="${asset(DYE_TEXTURES[dye])}" alt="${dye}">`).join("");
        const dyesLabel = window.PplI18n ? window.PplI18n.t("leather_dyes") : "Красителей";
        div.innerHTML = `
                <div class="result-color">
                    <div class="result-preview"
                         style="background:${item.hex}"></div>

                    <div class="result-hex">
                        ${item.hex}
                    </div>
                </div>
                <div class="result-info">

                    <div class="result-title">
                        ΔE
                    </div>

                    <div class="result-value">
                        <b>${item.deltaE.toFixed(2)}</b>
                    </div>
                </div>
                <div class="result-info">

                    <div class="result-title">
                        ${dyesLabel}
                    </div>

                    <div class="result-value">
                        ${item.length}
                    </div>

                </div>
                <div class="result-recipes">
                    ${textures}
                </div>
        `;
        div.addEventListener("click", () => {
            updateColor(item.hex);
            setArmorPreview(item.hex);
        });
        container.appendChild(div);
    }
    if (results[0]) {
        setArmorPreview(results[0].hex);
    }
}

function setArmorPreview(hex) {
    document.querySelectorAll(".armor-piece").forEach((piece) => {
        piece.style.setProperty("--armor-color", hex);
    });
}

const colorInput = document.getElementById("color");
const runButton = document.getElementById("run");

runButton.addEventListener("click", () => {
    if (!workerReady && !leatherWorker) {
        alert(window.PplI18n ? window.PplI18n.t("leather_not_ready") : "Секунду, цифры ещё едут.");
        return;
    }

    let color = colorInput.value.trim();
    localStorage.setItem(COLOR_STORAGE_KEY, color);
    findNearest(color);

});

const picker = document.getElementById("color");
const hex = document.getElementById("colorHex");

const r = document.getElementById("colorR");
const g = document.getElementById("colorG");
const b = document.getElementById("colorB");

function updateColor(value){

    value = value.toUpperCase();

    picker.value = value;

    hex.value = value;

    const rgb = chroma(value).rgb();

    r.textContent = rgb[0];
    g.textContent = rgb[1];
    b.textContent = rgb[2];
    setArmorPreview(value);
    localStorage.setItem(COLOR_STORAGE_KEY, value);

}

picker.addEventListener("input", () => {

    updateColor(picker.value);

});

hex.addEventListener("input", () => {

    let value = hex.value;

    if(!value.startsWith("#"))
        value = "#" + value;

    if(/^#[0-9A-Fa-f]{6}$/.test(value))
        updateColor(value);

});

const savedColor = localStorage.getItem(COLOR_STORAGE_KEY);
updateColor(savedColor && /^#[0-9A-Fa-f]{6}$/i.test(savedColor) ? savedColor : "#FF0000");
