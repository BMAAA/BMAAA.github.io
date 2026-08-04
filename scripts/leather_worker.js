const DYE_IDS = [
  "white_dye",
  "light_gray_dye",
  "gray_dye",
  "black_dye",
  "brown_dye",
  "red_dye",
  "orange_dye",
  "yellow_dye",
  "lime_dye",
  "green_dye",
  "cyan_dye",
  "light_blue_dye",
  "blue_dye",
  "purple_dye",
  "magenta_dye",
  "pink_dye",
];

const DYE_RGB = [
  [249, 255, 254],
  [157, 157, 151],
  [71, 79, 82],
  [29, 29, 33],
  [131, 84, 50],
  [176, 46, 38],
  [249, 128, 29],
  [254, 216, 61],
  [128, 199, 31],
  [94, 124, 22],
  [22, 156, 156],
  [58, 179, 218],
  [60, 68, 170],
  [137, 50, 184],
  [199, 78, 189],
  [243, 139, 170],
];

const MAX_LENGTH = 7;
const TOP_N = 5;
const CANDIDATE_N = 256;

function mixJava(indices) {
  const n = indices.length;
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;
  let totalMaximum = 0;
  for (let i = 0; i < n; i++) {
    const rgb = DYE_RGB[indices[i]];
    totalRed += rgb[0];
    totalGreen += rgb[1];
    totalBlue += rgb[2];
    totalMaximum += Math.max(rgb[0], rgb[1], rgb[2]);
  }
  const averageRed = Math.floor(totalRed / n);
  const averageGreen = Math.floor(totalGreen / n);
  const averageBlue = Math.floor(totalBlue / n);
  const averageMaximum = totalMaximum / n;
  const maximumOfAverage = Math.max(averageRed, averageGreen, averageBlue);
  const gainFactor = averageMaximum / maximumOfAverage;
  return [
    Math.floor(averageRed * gainFactor),
    Math.floor(averageGreen * gainFactor),
    Math.floor(averageBlue * gainFactor),
  ];
}

function toHex(rgb) {
  return (
    "#" +
    rgb
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgb2lab(rgb) {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;
  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function deltaE(labA, labB) {
  const deltaL = labA[0] - labB[0];
  const deltaA = labA[1] - labB[1];
  const deltaB = labA[2] - labB[2];
  const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  const deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  const sc = 1.0 + 0.045 * c1;
  const sh = 1.0 + 0.015 * c1;
  const deltaLKlsl = deltaL / 1.0;
  const deltaCkcsc = deltaC / sc;
  const deltaHkhsh = deltaH / sh;
  const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

function forEachCombWithRep(length, n, fn) {
  const comb = new Array(length);
  function next(pos, start) {
    if (pos === length) {
      fn(comb);
      return;
    }
    for (let i = start; i < n; i++) {
      comb[pos] = i;
      next(pos + 1, i);
    }
  }
  next(0, 0);
}

function insertBest(best, entry) {
  const key = entry.indices.join(",");
  const existing = best.findIndex((item) => item.indices.join(",") === key);
  if (existing !== -1) {
    if (entry.deltaE < best[existing].deltaE) {
      best[existing] = entry;
      best.sort((a, b) => a.deltaE - b.deltaE || a.length - b.length);
    }
    return;
  }
  best.push(entry);
  best.sort((a, b) => a.deltaE - b.deltaE || a.length - b.length);
  if (best.length > CANDIDATE_N) {
    best.pop();
  }
}

function trimSequence(indices, targetLab, baseDelta) {
  let bestIndices = indices.slice();
  let bestDelta = baseDelta;
  for (let i = indices.length - 1; i >= 1; i--) {
    const shorter = indices.slice(0, i);
    const rgb = mixJava(shorter);
    const delta = deltaE(rgb2lab(rgb), targetLab);
    if (delta <= bestDelta) {
      bestDelta = delta;
      bestIndices = shorter;
    } else {
      break;
    }
  }
  return { indices: bestIndices, deltaE: bestDelta, rgb: mixJava(bestIndices) };
}

function findTop(targetRgb) {
  const targetLab = rgb2lab(targetRgb);
  const best = [];
  for (let length = 1; length <= MAX_LENGTH; length++) {
    forEachCombWithRep(length, DYE_IDS.length, (comb) => {
      const indices = comb.slice();
      const rgb = mixJava(indices);
      const delta = deltaE(rgb2lab(rgb), targetLab);
      if (best.length < CANDIDATE_N || delta <= best[best.length - 1].deltaE) {
        insertBest(best, {
          deltaE: delta,
          length: indices.length,
          indices,
          hex: toHex(rgb),
          rgb,
        });
      }
    });
  }
  return best.map((entry) => {
    const trimmed = trimSequence(entry.indices, targetLab, entry.deltaE);
    return {
      hex: toHex(trimmed.rgb),
      length: trimmed.indices.length,
      combo: trimmed.indices.map((i) => DYE_IDS[i]),
      deltaE: trimmed.deltaE,
    };
  });
}

function parseHex(hex) {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

self.onmessage = (event) => {
  const data = event.data;
  if (!data || data.type !== "find") return;
  try {
    const results = findTop(parseHex(data.hex));
    results.sort((a, b) => a.deltaE - b.deltaE || a.length - b.length);
    const unique = [];
    for (const item of results) {
      if (unique.some((u) => u.hex === item.hex)) continue;
      unique.push(item);
      if (unique.length === TOP_N) break;
    }
    self.postMessage({ type: "result", results: unique });
  } catch (error) {
    self.postMessage({ type: "error", message: String(error && error.message ? error.message : error) });
  }
};

self.postMessage({ type: "ready" });
