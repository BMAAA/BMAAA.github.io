const DYE_TEXTURES = {
    white_dye: "/assets/textures/white_dye.png",
    orange_dye: "/assets/textures/orange_dye.png",
    magenta_dye: "/assets/textures/magenta_dye.png",
    light_blue_dye: "/assets/textures/light_blue_dye.png",
    yellow_dye: "/assets/textures/yellow_dye.png",
    lime_dye: "/assets/textures/lime_dye.png",
    pink_dye: "/assets/textures/pink_dye.png",
    gray_dye: "/assets/textures/gray_dye.png",
    light_gray_dye: "/assets/textures/light_gray_dye.png",
    cyan_dye: "/assets/textures/cyan_dye.png",
    purple_dye: "/assets/textures/purple_dye.png",
    blue_dye: "/assets/textures/blue_dye.png",
    brown_dye: "/assets/textures/brown_dye.png",
    green_dye: "/assets/textures/green_dye.png",
    red_dye: "/assets/textures/red_dye.png",
    black_dye: "/assets/textures/black_dye.png"
};

class KDNode {
    constructor(point, axis) {
        this.point = point;
        this.axis = axis;
        this.left = null;
        this.right = null;
    }
}

class KDTree {
    constructor(points) {
        this.root = this.build(points, 0);
    }

    build(points, depth) {
        if (!points.length)
            return null;

        const axis = depth % 3;
        points.sort((a, b) => a.lab[axis] - b.lab[axis]);

        const mid = Math.floor(points.length / 2);
        const node = new KDNode(points[mid], axis);

        node.left = this.build(points.slice(0, mid), depth + 1);
        node.right = this.build(points.slice(mid + 1), depth + 1);

        return node;
    }

    nearest(targetLab, count = 5) {
        const best = [];
        function visit(node) {
            if (!node)
                return;

            const d = Math.sqrt(
                (targetLab[0] - node.point.lab[0]) ** 2 +
                (targetLab[1] - node.point.lab[1]) ** 2 +
                (targetLab[2] - node.point.lab[2]) ** 2);

            if (best.length < count || d < best[best.length - 1].distance) {
                best.push({point: node.point,distance: d});

                best.sort((a, b) => a.distance - b.distance);
                if (best.length > count) best.pop();
            }

            const axis = node.axis;

            const diff = targetLab[axis] - node.point.lab[axis];

            const first = diff < 0 ? node.left : node.right;
            const second = diff < 0 ? node.right : node.left;

            visit(first);

            if (best.length < count || Math.abs(diff) < best[best.length - 1].distance) {
                visit(second);
            }
        }

        visit(this.root);
        return best.map(x => x.point);
    }
}

/* URAyaderka МОЕГО СТРИМЕРА НАКОНЕЦТО ЗАБЕРУТ В ДУРКУ Durka KEKW literallyPWGood ALERT */
async function loadDatabase(url) {
    let text = await fetch(url).then(r => r.text());
    const lines = text
    .replaceAll("\r", "")
    .trim()
    .split("\n");
    console.log(lines)
    lines.shift();
    return lines.map(line => {
        const [hex, length, combo] = line.split(",");
        return {hex, length: Number(length), combo: combo.split(";"), lab: chroma(hex).lab()};
    });
}


const container = document.getElementById("results");
const loading = document.getElementById("loading");
const run = document.getElementById("run");


function findNearest(hex) {
    run.disabled = true;
    container.innerHTML = "";
    loading.classList.remove("hidden");

    const lab = chroma(hex).lab();
    let results = tree.nearest(lab, 20);

    results = results
        .map(r => ({...r, deltaE: chroma.deltaE(hex, r.hex)}))
        .sort((a, b) => a.deltaE - b.deltaE)
        .slice(0, 5);

    loading.classList.add("hidden");
    renderResults(results);
    run.disabled = false;
}

function renderResults(results) {
    const container = document.getElementById("results");
    console.log('Starting rendering')
    container.innerHTML = "";
    for (const item of results) {
        const div = document.createElement("div");
        div.className = "result";
        const textures = item.combo.map(dye =>`<img class="dye" src="${DYE_TEXTURES[dye]}" alt="${dye}">`).join("");
        console.log(item.combo)
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
                        Красителей
                    </div>

                    <div class="result-value">
                        ${item.length}
                    </div>

                </div>
                <div class="result-recipes">
                    ${textures}
                </div>
        `;
        container.appendChild(div);
    }
}

const colorInput = document.getElementById("color");
const runButton = document.getElementById("run");

runButton.addEventListener("click", () => {
    if (!tree) {
        alert("База цветов ещё загружается.");
        return;
    }

    let color = colorInput.value.trim();

    findNearest(color);

});

let tree = null;

(async () => {
    const database = await loadDatabase("/data/leather_colors.csv");
    tree = new KDTree(database);
    console.log("База загружена:", database.length);
})();

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

updateColor("#FF0000");