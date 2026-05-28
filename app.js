const A4 = { width: 2100, height: 2970 };
const NS = "http://www.w3.org/2000/svg";

const adultThemeLabels = {
  random: "랜덤 프리미엄 도안",
  cozyInterior: "코지 인테리어",
  botanicalPortrait: "보태니컬 인물",
  vintageMarket: "빈티지 마켓",
  cityCafe: "도시 카페 거리",
  fantasyLibrary: "판타지 서재",
  ornamentalAnimal: "장식 동물",
};

const randomThemes = ["cozyInterior", "botanicalPortrait", "vintageMarket", "cityCafe", "fantasyLibrary", "ornamentalAnimal"];

const controls = {
  apiKey: document.querySelector("#apiKey"),
  imageModel: document.querySelector("#imageModel"),
  rememberApiKey: document.querySelector("#rememberApiKey"),
  theme: document.querySelector("#theme"),
  style: document.querySelector("#style"),
  strokeWidth: document.querySelector("#strokeWidth"),
  includeTitle: document.querySelector("#includeTitle"),
  wideMargin: document.querySelector("#wideMargin"),
  generateBtn: document.querySelector("#generateBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  downloadPngBtn: document.querySelector("#downloadPngBtn"),
  downloadSvgBtn: document.querySelector("#downloadSvgBtn"),
  shareBtn: document.querySelector("#shareBtn"),
  printBtn: document.querySelector("#printBtn"),
  artwork: document.querySelector("#artwork"),
  status: document.querySelector("#status"),
};

let seed = Date.now();
let currentTheme = randomThemes[seed % randomThemes.length];
let currentAiImageUrl = "";

function mulberry32(value) {
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  children.forEach((child) => el.appendChild(child));
  return el;
}

function add(parent, tag, attrs = {}) {
  const el = svgEl(tag, attrs);
  parent.appendChild(el);
  return el;
}

function path(parent, d, attrs = {}) {
  return add(parent, "path", { d, ...attrs });
}

function baseStroke(width) {
  return {
    fill: "none",
    stroke: "#111",
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
}

function selectedDifficulty() {
  return document.querySelector("input[name='difficulty']:checked").value;
}

function activeTheme() {
  if (controls.theme.value === "random") {
    return currentTheme;
  }
  return controls.theme.value;
}

function titleText(theme = activeTheme()) {
  if (controls.theme.value === "random") {
    return "랜덤 컬러링";
  }
  return adultThemeLabels[theme] || "컬러링 도안";
}

function currentSettings() {
  return {
    apiKey: controls.apiKey.value.trim(),
    imageModel: controls.imageModel.value.trim() || "gpt-image-1.5",
    theme: controls.theme.value === "random" ? currentTheme : controls.theme.value,
    difficulty: selectedDifficulty(),
    style: controls.style.value,
    wideMargin: controls.wideMargin.checked,
    includeTitle: controls.includeTitle.checked,
  };
}

function difficultyConfig(difficulty) {
  return {
    easy: { extras: 4, detail: 0, micro: 0, scale: 1.12, label: "가볍게" },
    medium: { extras: 18, detail: 20, micro: 16, scale: 1.02, label: "집중" },
    hard: { extras: 58, detail: 72, micro: 72, scale: 0.92, label: "고난도" },
  }[difficulty];
}

function setStatus(message) {
  controls.status.textContent = message;
}

function setBusy(isBusy) {
  controls.generateBtn.disabled = isBusy;
  controls.sampleBtn.disabled = isBusy;
  controls.generateBtn.textContent = isBusy ? "AI 도안 생성 중..." : "AI 도안 만들기";
}

function base64ToBlob(base64, mimeType = "image/png") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function setAiImage(imageBase64, mimeType) {
  if (currentAiImageUrl) {
    URL.revokeObjectURL(currentAiImageUrl);
  }
  const blob = base64ToBlob(imageBase64, mimeType);
  currentAiImageUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.alt = `${titleText()} AI 컬러링 도안`;
  image.src = currentAiImageUrl;
  image.dataset.kind = "ai";
  controls.artwork.replaceChildren(image);
}

function loadApiSettings() {
  const savedKey = localStorage.getItem("coloringBookOpenAIKey") || "";
  const savedModel = localStorage.getItem("coloringBookImageModel") || "gpt-image-1.5";
  controls.apiKey.value = savedKey;
  controls.imageModel.value = savedModel;
  controls.rememberApiKey.checked = Boolean(savedKey);
}

function saveApiSettings() {
  localStorage.setItem("coloringBookImageModel", controls.imageModel.value.trim() || "gpt-image-1.5");
  if (controls.rememberApiKey.checked) {
    localStorage.setItem("coloringBookOpenAIKey", controls.apiKey.value.trim());
  } else {
    localStorage.removeItem("coloringBookOpenAIKey");
  }
}

function drawAnimal(g, x, y, size, stroke) {
  const s = size;
  add(g, "circle", { cx: x, cy: y, r: s * 0.32, ...stroke });
  add(g, "ellipse", { cx: x, cy: y + s * 0.48, rx: s * 0.42, ry: s * 0.5, ...stroke });
  add(g, "circle", { cx: x - s * 0.23, cy: y - s * 0.28, r: s * 0.14, ...stroke });
  add(g, "circle", { cx: x + s * 0.23, cy: y - s * 0.28, r: s * 0.14, ...stroke });
  add(g, "circle", { cx: x - s * 0.12, cy: y - s * 0.04, r: s * 0.025, fill: "#111" });
  add(g, "circle", { cx: x + s * 0.12, cy: y - s * 0.04, r: s * 0.025, fill: "#111" });
  path(g, `M ${x - s * 0.05} ${y + s * 0.07} Q ${x} ${y + s * 0.12} ${x + s * 0.05} ${y + s * 0.07}`, stroke);
  path(g, `M ${x - s * 0.5} ${y + s * 0.35} Q ${x - s * 0.75} ${y + s * 0.48} ${x - s * 0.45} ${y + s * 0.62}`, stroke);
  path(g, `M ${x + s * 0.5} ${y + s * 0.35} Q ${x + s * 0.75} ${y + s * 0.48} ${x + s * 0.45} ${y + s * 0.62}`, stroke);
}

function drawCat(g, x, y, size, stroke) {
  const s = size;
  add(g, "circle", { cx: x, cy: y, r: s * 0.33, ...stroke });
  path(g, `M ${x - s * 0.25} ${y - s * 0.22} L ${x - s * 0.38} ${y - s * 0.58} L ${x - s * 0.06} ${y - s * 0.36}`, stroke);
  path(g, `M ${x + s * 0.25} ${y - s * 0.22} L ${x + s * 0.38} ${y - s * 0.58} L ${x + s * 0.06} ${y - s * 0.36}`, stroke);
  add(g, "ellipse", { cx: x, cy: y + s * 0.52, rx: s * 0.38, ry: s * 0.48, ...stroke });
  add(g, "circle", { cx: x - s * 0.12, cy: y - s * 0.04, r: s * 0.024, fill: "#111" });
  add(g, "circle", { cx: x + s * 0.12, cy: y - s * 0.04, r: s * 0.024, fill: "#111" });
  path(g, `M ${x} ${y + s * 0.02} L ${x - s * 0.04} ${y + s * 0.07} L ${x + s * 0.04} ${y + s * 0.07} Z`, stroke);
  path(g, `M ${x - s * 0.05} ${y + s * 0.1} Q ${x - s * 0.1} ${y + s * 0.16} ${x - s * 0.18} ${y + s * 0.12}`, stroke);
  path(g, `M ${x + s * 0.05} ${y + s * 0.1} Q ${x + s * 0.1} ${y + s * 0.16} ${x + s * 0.18} ${y + s * 0.12}`, stroke);
  path(g, `M ${x - s * 0.1} ${y + s * 0.66} Q ${x - s * 0.34} ${y + s * 0.96} ${x - s * 0.55} ${y + s * 0.7}`, stroke);
  path(g, `M ${x + s * 0.1} ${y + s * 0.66} Q ${x + s * 0.34} ${y + s * 0.96} ${x + s * 0.55} ${y + s * 0.7}`, stroke);
  path(g, `M ${x + s * 0.34} ${y + s * 0.34} Q ${x + s * 0.78} ${y + s * 0.18} ${x + s * 0.56} ${y - s * 0.08}`, stroke);
}

function drawDino(g, x, y, size, stroke) {
  const s = size;
  add(g, "ellipse", { cx: x, cy: y + s * 0.25, rx: s * 0.58, ry: s * 0.34, ...stroke });
  add(g, "circle", { cx: x + s * 0.48, cy: y - s * 0.12, r: s * 0.26, ...stroke });
  path(g, `M ${x - s * 0.48} ${y + s * 0.2} Q ${x - s * 0.95} ${y + s * 0.04} ${x - s * 0.8} ${y - s * 0.28}`, stroke);
  path(g, `M ${x - s * 0.24} ${y - s * 0.08} L ${x - s * 0.08} ${y - s * 0.42} L ${x + s * 0.08} ${y - s * 0.08}`, stroke);
  path(g, `M ${x + s * 0.1} ${y - s * 0.06} L ${x + s * 0.26} ${y - s * 0.38} L ${x + s * 0.36} ${y - s * 0.05}`, stroke);
  add(g, "circle", { cx: x + s * 0.56, cy: y - s * 0.18, r: s * 0.025, fill: "#111" });
  path(g, `M ${x + s * 0.46} ${y - s * 0.02} Q ${x + s * 0.58} ${y + s * 0.07} ${x + s * 0.68} ${y - s * 0.02}`, stroke);
  path(g, `M ${x - s * 0.18} ${y + s * 0.56} L ${x - s * 0.28} ${y + s * 0.82} L ${x - s * 0.05} ${y + s * 0.82}`, stroke);
  path(g, `M ${x + s * 0.24} ${y + s * 0.55} L ${x + s * 0.18} ${y + s * 0.82} L ${x + s * 0.42} ${y + s * 0.82}`, stroke);
}

function drawRocket(g, x, y, size, stroke) {
  const s = size;
  path(g, `M ${x} ${y - s * 0.75} C ${x + s * 0.36} ${y - s * 0.34} ${x + s * 0.25} ${y + s * 0.28} ${x} ${y + s * 0.55} C ${x - s * 0.25} ${y + s * 0.28} ${x - s * 0.36} ${y - s * 0.34} ${x} ${y - s * 0.75} Z`, stroke);
  add(g, "circle", { cx: x, cy: y - s * 0.18, r: s * 0.16, ...stroke });
  path(g, `M ${x - s * 0.24} ${y + s * 0.28} L ${x - s * 0.52} ${y + s * 0.58} L ${x - s * 0.24} ${y + s * 0.5}`, stroke);
  path(g, `M ${x + s * 0.24} ${y + s * 0.28} L ${x + s * 0.52} ${y + s * 0.58} L ${x + s * 0.24} ${y + s * 0.5}`, stroke);
  path(g, `M ${x - s * 0.12} ${y + s * 0.58} Q ${x} ${y + s * 0.98} ${x + s * 0.12} ${y + s * 0.58}`, stroke);
}

function drawFish(g, x, y, size, stroke) {
  const s = size;
  add(g, "ellipse", { cx: x, cy: y, rx: s * 0.55, ry: s * 0.31, ...stroke });
  path(g, `M ${x - s * 0.5} ${y} L ${x - s * 0.9} ${y - s * 0.28} L ${x - s * 0.9} ${y + s * 0.28} Z`, stroke);
  add(g, "circle", { cx: x + s * 0.28, cy: y - s * 0.08, r: s * 0.028, fill: "#111" });
  path(g, `M ${x - s * 0.08} ${y - s * 0.3} Q ${x + s * 0.08} ${y - s * 0.58} ${x + s * 0.23} ${y - s * 0.26}`, stroke);
  path(g, `M ${x - s * 0.05} ${y + s * 0.29} Q ${x + s * 0.13} ${y + s * 0.52} ${x + s * 0.28} ${y + s * 0.24}`, stroke);
}

function drawCastle(g, x, y, size, stroke) {
  const s = size;
  add(g, "rect", { x: x - s * 0.48, y: y - s * 0.05, width: s * 0.96, height: s * 0.68, ...stroke });
  add(g, "rect", { x: x - s * 0.72, y: y - s * 0.32, width: s * 0.24, height: s * 0.95, ...stroke });
  add(g, "rect", { x: x + s * 0.48, y: y - s * 0.32, width: s * 0.24, height: s * 0.95, ...stroke });
  path(g, `M ${x - s * 0.74} ${y - s * 0.32} L ${x - s * 0.6} ${y - s * 0.62} L ${x - s * 0.46} ${y - s * 0.32}`, stroke);
  path(g, `M ${x + s * 0.46} ${y - s * 0.32} L ${x + s * 0.6} ${y - s * 0.62} L ${x + s * 0.74} ${y - s * 0.32}`, stroke);
  path(g, `M ${x - s * 0.16} ${y + s * 0.63} L ${x - s * 0.16} ${y + s * 0.25} Q ${x} ${y + s * 0.05} ${x + s * 0.16} ${y + s * 0.25} L ${x + s * 0.16} ${y + s * 0.63}`, stroke);
  add(g, "rect", { x: x - s * 0.32, y: y + s * 0.1, width: s * 0.14, height: s * 0.16, ...stroke });
  add(g, "rect", { x: x + s * 0.18, y: y + s * 0.1, width: s * 0.14, height: s * 0.16, ...stroke });
}

function drawRobot(g, x, y, size, stroke) {
  const s = size;
  add(g, "rect", { x: x - s * 0.38, y: y - s * 0.58, width: s * 0.76, height: s * 0.48, rx: s * 0.08, ...stroke });
  add(g, "rect", { x: x - s * 0.48, y: y - s * 0.02, width: s * 0.96, height: s * 0.72, rx: s * 0.06, ...stroke });
  add(g, "circle", { cx: x - s * 0.16, cy: y - s * 0.36, r: s * 0.045, fill: "#111" });
  add(g, "circle", { cx: x + s * 0.16, cy: y - s * 0.36, r: s * 0.045, fill: "#111" });
  path(g, `M ${x - s * 0.14} ${y - s * 0.22} L ${x + s * 0.14} ${y - s * 0.22}`, stroke);
  path(g, `M ${x} ${y - s * 0.58} L ${x} ${y - s * 0.8}`, stroke);
  add(g, "circle", { cx: x, cy: y - s * 0.86, r: s * 0.055, ...stroke });
  path(g, `M ${x - s * 0.48} ${y + s * 0.18} L ${x - s * 0.78} ${y + s * 0.36}`, stroke);
  path(g, `M ${x + s * 0.48} ${y + s * 0.18} L ${x + s * 0.78} ${y + s * 0.36}`, stroke);
  add(g, "circle", { cx: x - s * 0.18, cy: y + s * 0.28, r: s * 0.08, ...stroke });
  add(g, "rect", { x: x + s * 0.06, y: y + s * 0.2, width: s * 0.22, height: s * 0.16, ...stroke });
}

function drawSoccerBall(g, x, y, size, stroke) {
  const s = size;
  add(g, "circle", { cx: x, cy: y, r: s * 0.28, ...stroke });
  path(g, `M ${x} ${y - s * 0.12} L ${x + s * 0.12} ${y - s * 0.04} L ${x + s * 0.08} ${y + s * 0.1} L ${x - s * 0.08} ${y + s * 0.1} L ${x - s * 0.12} ${y - s * 0.04} Z`, stroke);
  path(g, `M ${x - s * 0.12} ${y - s * 0.04} L ${x - s * 0.25} ${y - s * 0.12}`, stroke);
  path(g, `M ${x + s * 0.12} ${y - s * 0.04} L ${x + s * 0.25} ${y - s * 0.12}`, stroke);
  path(g, `M ${x - s * 0.08} ${y + s * 0.1} L ${x - s * 0.18} ${y + s * 0.23}`, stroke);
  path(g, `M ${x + s * 0.08} ${y + s * 0.1} L ${x + s * 0.18} ${y + s * 0.23}`, stroke);
}

function drawRosette(g, x, y, size, stroke) {
  const s = size;
  add(g, "circle", { cx: x, cy: y, r: s * 0.34, ...stroke });
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const px = x + Math.cos(angle) * s * 0.34;
    const py = y + Math.sin(angle) * s * 0.34;
    add(g, "ellipse", {
      cx: px,
      cy: py,
      rx: s * 0.1,
      ry: s * 0.22,
      transform: `rotate(${(angle * 180) / Math.PI} ${px} ${py})`,
      ...stroke,
    });
  }
  add(g, "circle", { cx: x, cy: y, r: s * 0.12, ...stroke });
}

function drawMandala(g, x, y, size, stroke) {
  const s = size;
  add(g, "circle", { cx: x, cy: y, r: s * 0.42, ...stroke });
  add(g, "circle", { cx: x, cy: y, r: s * 0.24, ...stroke });
  add(g, "circle", { cx: x, cy: y, r: s * 0.1, ...stroke });
  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    const px = x + Math.cos(angle) * s * 0.34;
    const py = y + Math.sin(angle) * s * 0.34;
    add(g, "ellipse", {
      cx: px,
      cy: py,
      rx: s * 0.08,
      ry: s * 0.22,
      transform: `rotate(${(angle * 180) / Math.PI} ${px} ${py})`,
      ...stroke,
    });
    path(g, `M ${x} ${y} L ${px} ${py}`, stroke);
  }
}

function drawLeaf(g, x, y, size, angle, stroke) {
  const s = size;
  const transform = `rotate(${angle} ${x} ${y})`;
  path(g, `M ${x} ${y - s * 0.55} C ${x + s * 0.38} ${y - s * 0.2} ${x + s * 0.35} ${y + s * 0.35} ${x} ${y + s * 0.58} C ${x - s * 0.35} ${y + s * 0.35} ${x - s * 0.38} ${y - s * 0.2} ${x} ${y - s * 0.55} Z`, { ...stroke, transform });
  path(g, `M ${x} ${y - s * 0.48} L ${x} ${y + s * 0.48}`, { ...stroke, transform });
  path(g, `M ${x} ${y - s * 0.05} C ${x + s * 0.16} ${y - s * 0.12} ${x + s * 0.22} ${y - s * 0.24} ${x + s * 0.3} ${y - s * 0.32}`, { ...stroke, transform });
  path(g, `M ${x} ${y + s * 0.15} C ${x - s * 0.16} ${y + s * 0.08} ${x - s * 0.22} ${y - s * 0.04} ${x - s * 0.3} ${y - s * 0.12}`, { ...stroke, transform });
}

function drawBotanical(g, x, y, size, stroke) {
  const s = size;
  path(g, `M ${x} ${y + s * 0.72} C ${x - s * 0.2} ${y + s * 0.2} ${x + s * 0.18} ${y - s * 0.2} ${x} ${y - s * 0.72}`, stroke);
  for (let i = 0; i < 10; i += 1) {
    const t = i / 9;
    const yy = y + s * 0.52 - t * s * 1.05;
    const side = i % 2 === 0 ? -1 : 1;
    drawLeaf(g, x + side * s * (0.22 + t * 0.08), yy, s * (0.22 - t * 0.04), side < 0 ? -48 : 48, stroke);
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const px = x + Math.cos(angle) * s * 0.1;
    const py = y - s * 0.7 + Math.sin(angle) * s * 0.1;
    add(g, "ellipse", {
      cx: px,
      cy: py,
      rx: s * 0.08,
      ry: s * 0.18,
      transform: `rotate(${(angle * 180) / Math.PI} ${px} ${py})`,
      ...stroke,
    });
  }
  add(g, "circle", { cx: x, cy: y - s * 0.7, r: s * 0.07, ...stroke });
}

function drawArtNouveau(g, x, y, size, stroke) {
  const s = size;
  path(g, `M ${x - s * 0.55} ${y + s * 0.65} C ${x - s * 0.9} ${y - s * 0.05} ${x - s * 0.3} ${y - s * 0.78} ${x} ${y - s * 0.62} C ${x + s * 0.3} ${y - s * 0.78} ${x + s * 0.9} ${y - s * 0.05} ${x + s * 0.55} ${y + s * 0.65}`, stroke);
  path(g, `M ${x - s * 0.38} ${y + s * 0.55} C ${x - s * 0.58} ${y - s * 0.04} ${x - s * 0.15} ${y - s * 0.52} ${x} ${y - s * 0.38} C ${x + s * 0.15} ${y - s * 0.52} ${x + s * 0.58} ${y - s * 0.04} ${x + s * 0.38} ${y + s * 0.55}`, stroke);
  for (let i = 0; i < 7; i += 1) {
    const yy = y - s * 0.36 + i * s * 0.16;
    path(g, `M ${x - s * 0.48} ${yy} C ${x - s * 0.18} ${yy - s * 0.12} ${x + s * 0.18} ${yy + s * 0.12} ${x + s * 0.48} ${yy}`, stroke);
  }
  drawLeaf(g, x - s * 0.38, y + s * 0.15, s * 0.22, -42, stroke);
  drawLeaf(g, x + s * 0.38, y + s * 0.15, s * 0.22, 42, stroke);
}

function drawGeometric(g, x, y, size, stroke) {
  const s = size;
  for (let ring = 0; ring < 5; ring += 1) {
    const r = s * (0.14 + ring * 0.1);
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
      return `${x + Math.cos(angle) * r},${y + Math.sin(angle) * r}`;
    }).join(" ");
    add(g, "polygon", { points, ...stroke });
  }
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    path(g, `M ${x} ${y} L ${x + Math.cos(angle) * s * 0.62} ${y + Math.sin(angle) * s * 0.62}`, stroke);
  }
}

function drawPaisley(g, x, y, size, stroke) {
  const s = size;
  path(g, `M ${x - s * 0.18} ${y - s * 0.72} C ${x + s * 0.68} ${y - s * 0.46} ${x + s * 0.62} ${y + s * 0.45} ${x + s * 0.02} ${y + s * 0.68} C ${x - s * 0.52} ${y + s * 0.88} ${x - s * 0.8} ${y + s * 0.32} ${x - s * 0.4} ${y - s * 0.04} C ${x - s * 0.12} ${y - s * 0.3} ${x - s * 0.05} ${y - s * 0.48} ${x - s * 0.18} ${y - s * 0.72} Z`, stroke);
  path(g, `M ${x - s * 0.12} ${y - s * 0.38} C ${x + s * 0.36} ${y - s * 0.18} ${x + s * 0.34} ${y + s * 0.34} ${x - s * 0.02} ${y + s * 0.42}`, stroke);
  drawRosette(g, x + s * 0.1, y + s * 0.1, s * 0.28, stroke);
  for (let i = 0; i < 5; i += 1) {
    add(g, "circle", { cx: x - s * 0.22 + i * s * 0.12, cy: y - s * 0.1 + i * s * 0.08, r: s * 0.035, ...stroke });
  }
}

function drawCity(g, x, y, size, stroke) {
  const s = size;
  const baseY = y + s * 0.52;
  for (let i = 0; i < 8; i += 1) {
    const w = s * (0.11 + (i % 3) * 0.025);
    const h = s * (0.38 + ((i * 37) % 5) * 0.08);
    const bx = x - s * 0.58 + i * s * 0.16;
    add(g, "rect", { x: bx, y: baseY - h, width: w, height: h, ...stroke });
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        add(g, "rect", { x: bx + w * 0.18 + col * w * 0.36, y: baseY - h + s * 0.06 + row * s * 0.08, width: w * 0.16, height: s * 0.035, ...stroke });
      }
    }
  }
  path(g, `M ${x - s * 0.68} ${baseY} L ${x + s * 0.68} ${baseY}`, stroke);
  path(g, `M ${x - s * 0.6} ${baseY + s * 0.12} C ${x - s * 0.15} ${baseY - s * 0.02} ${x + s * 0.15} ${baseY + s * 0.26} ${x + s * 0.6} ${baseY + s * 0.08}`, stroke);
}

const drawers = {
  cozyInterior: drawCity,
  botanicalPortrait: drawBotanical,
  vintageMarket: drawCity,
  cityCafe: drawCity,
  fantasyLibrary: drawArtNouveau,
  ornamentalAnimal: drawMandala,
  mandala: drawMandala,
  botanical: drawBotanical,
  artNouveau: drawArtNouveau,
  geometric: drawGeometric,
  paisley: drawPaisley,
  city: drawCity,
};

function decorate(svg, theme, difficulty, stroke, random) {
  const cfg = difficultyConfig(difficulty);
  const g = add(svg, "g", { class: "decorations" });
  const count = cfg.extras;
  for (let i = 0; i < count; i += 1) {
    const x = 180 + random() * 1740;
    const y = 420 + random() * 2200;
    const r = 30 + random() * 60;
    if (theme === "geometric") {
      add(g, "polygon", {
        points: `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`,
        ...stroke,
      });
    } else if (theme === "botanical") {
      drawLeaf(g, x, y, r * 1.1, random() * 180 - 90, stroke);
    } else if (theme === "paisley") {
      drawPaisley(g, x, y, r * 1.8, stroke);
    } else if (theme === "artNouveau") {
      path(g, `M ${x - r} ${y + r} C ${x - r * 0.4} ${y - r} ${x + r * 0.4} ${y - r} ${x + r} ${y + r}`, stroke);
      path(g, `M ${x - r * 0.6} ${y + r * 0.55} C ${x - r * 0.2} ${y - r * 0.4} ${x + r * 0.2} ${y - r * 0.4} ${x + r * 0.6} ${y + r * 0.55}`, stroke);
    } else if (theme === "city") {
      add(g, "rect", { x: x - r * 0.32, y: y - r * 0.7, width: r * 0.64, height: r * 1.2, ...stroke });
      add(g, "rect", { x: x - r * 0.16, y: y - r * 0.35, width: r * 0.1, height: r * 0.12, ...stroke });
      add(g, "rect", { x: x + r * 0.06, y: y - r * 0.35, width: r * 0.1, height: r * 0.12, ...stroke });
    } else {
      drawRosette(g, x, y, r * 1.4, stroke);
    }
  }
}

function addAdultDetails(svg, difficulty, stroke, random) {
  const cfg = difficultyConfig(difficulty);
  const fineStroke = baseStroke(Math.max(5, Number(stroke["stroke-width"]) * 0.45));
  const g = add(svg, "g", { class: "adult-detail-lines" });

  for (let i = 0; i < cfg.detail; i += 1) {
    const x = 180 + random() * 1740;
    const y = 420 + random() * 2200;
    const w = 44 + random() * 110;
    const h = 26 + random() * 90;
    const type = i % 4;
    if (type === 0) {
      path(g, `M ${x - w} ${y} C ${x - w * 0.5} ${y - h} ${x + w * 0.5} ${y + h} ${x + w} ${y}`, fineStroke);
    } else if (type === 1) {
      add(g, "ellipse", { cx: x, cy: y, rx: w * 0.35, ry: h * 0.42, ...fineStroke });
    } else if (type === 2) {
      path(g, `M ${x - w * 0.45} ${y - h * 0.45} L ${x + w * 0.45} ${y - h * 0.45} L ${x} ${y + h * 0.48} Z`, fineStroke);
    } else {
      drawRosette(g, x, y, Math.min(w, h) * 1.25, fineStroke);
    }
  }

  if (difficulty === "hard") {
    for (let row = 0; row < 9; row += 1) {
      const y = 520 + row * 235;
      path(g, `M 210 ${y} C 520 ${y - 90} 750 ${y + 90} 1050 ${y} C 1350 ${y - 90} 1580 ${y + 90} 1890 ${y}`, fineStroke);
    }
  }
}

function addMicroPattern(svg, difficulty, random) {
  const cfg = difficultyConfig(difficulty);
  const g = add(svg, "g", { class: "micro-pattern" });
  const fineStroke = baseStroke(difficulty === "hard" ? 5 : 6);
  for (let i = 0; i < cfg.micro; i += 1) {
    const x = 190 + random() * 1720;
    const y = 380 + random() * 2320;
    const r = 14 + random() * 26;
    if (i % 3 === 0) {
      path(g, `M ${x - r} ${y} Q ${x} ${y - r} ${x + r} ${y} Q ${x} ${y + r} ${x - r} ${y}`, fineStroke);
    } else if (i % 3 === 1) {
      path(g, `M ${x - r} ${y - r} L ${x + r} ${y + r} M ${x + r} ${y - r} L ${x - r} ${y + r}`, fineStroke);
    } else {
      add(g, "circle", { cx: x, cy: y, r: r * 0.52, ...fineStroke });
    }
  }
}

function drawScene(svg, theme, stroke, random) {
  const g = add(svg, "g", { class: "scene-lines" });
  path(g, "M 160 2400 C 520 2260 820 2380 1080 2300 C 1380 2205 1600 2290 1940 2190", stroke);
  path(g, "M 220 640 C 540 520 740 610 940 520 C 1220 390 1510 570 1860 450", stroke);
  for (let i = 0; i < 5; i += 1) {
    const x = 250 + random() * 1500;
    const y = 2080 + random() * 270;
    path(g, `M ${x} ${y} C ${x + 48} ${y - 90} ${x + 100} ${y - 90} ${x + 148} ${y}`, stroke);
  }
  if (theme === "city") {
    drawCity(g, 1050, 1680, 980, stroke);
  } else if (theme === "botanical") {
    drawBotanical(g, 1050, 1550, 820, stroke);
  } else if (theme === "artNouveau") {
    drawArtNouveau(g, 1050, 1520, 900, stroke);
  }
}

function createArtwork() {
  const theme = activeTheme();
  const style = controls.style.value;
  const difficulty = selectedDifficulty();
  const cfg = difficultyConfig(difficulty);
  const random = mulberry32(seed);
  const lineWidth = Number(controls.strokeWidth.value) * 4;
  const stroke = baseStroke(lineWidth);
  const margin = controls.wideMargin.checked ? 150 : 90;
  const borderWidth = A4.width - margin * 2;
  const borderHeight = A4.height - margin * 2;

  const svg = svgEl("svg", {
    xmlns: NS,
    viewBox: `0 0 ${A4.width} ${A4.height}`,
    width: A4.width,
    height: A4.height,
    role: "img",
    "aria-label": `${titleText()} ${cfg.label} 색칠 도안`,
  });

  add(svg, "rect", { x: 0, y: 0, width: A4.width, height: A4.height, fill: "#fff" });
  add(svg, "rect", { x: margin, y: margin, width: borderWidth, height: borderHeight, rx: 28, ...baseStroke(10) });

  if (controls.includeTitle.checked) {
    const text = add(svg, "text", {
      x: 1050,
      y: 235,
      "text-anchor": "middle",
      "font-family": "system-ui, sans-serif",
      "font-size": "92",
      "font-weight": "800",
      fill: "#111",
    });
    text.textContent = titleText();
  }

  if (style === "scene") {
    drawScene(svg, theme, stroke, random);
  }

  const main = add(svg, "g", { class: "main-drawing" });
  const draw = drawers[theme] || drawMandala;
  if (style === "pattern") {
    const positions =
      difficulty === "easy"
        ? [
            [700, 950],
            [1400, 950],
            [700, 1900],
            [1400, 1900],
          ]
        : [
            [590, 760],
            [1510, 760],
            [590, 1540],
            [1510, 1540],
            [590, 2320],
            [1510, 2320],
          ];
    positions.forEach(([x, y], index) => draw(main, x, y, (410 + (index % 2) * 70) * cfg.scale, stroke));
  } else {
    draw(main, 1050, 1500, 760 * cfg.scale, stroke);
  }

  decorate(svg, theme, difficulty, stroke, random);
  addAdultDetails(svg, difficulty, stroke, random);

  if (difficulty !== "easy") {
    const details = add(svg, "g", { class: "detail-lines" });
    const amount = cfg.detail;
    for (let i = 0; i < amount; i += 1) {
      const x = 260 + random() * 1580;
      const y = 480 + random() * 2180;
      path(details, `M ${x - 48} ${y} Q ${x} ${y - 58} ${x + 48} ${y}`, baseStroke(lineWidth * 0.7));
    }
  }

  if (difficulty !== "easy") {
    addMicroPattern(svg, difficulty, random);
  }

  controls.artwork.replaceChildren(svg);
  setStatus(`${titleText(theme)} 도안을 새로 만들었습니다.`);
}

async function createAiArtwork() {
  if (!controls.apiKey.value.trim()) {
    setStatus("API 설정에 OpenAI API Key를 입력한 뒤 AI 도안을 만들 수 있습니다.");
    return;
  }
  saveApiSettings();
  setBusy(true);
  setStatus("AI가 컬러링북 스타일의 선화를 만드는 중입니다. 보통 20초 이상 걸릴 수 있습니다.");
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(currentSettings()),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "AI 도안 생성에 실패했습니다.");
    }
    if (data.imageBase64) {
      setAiImage(data.imageBase64, data.mimeType);
    } else if (data.image) {
      const image = new Image();
      image.alt = `${titleText()} AI 컬러링 도안`;
      image.src = data.image;
      image.dataset.kind = "ai";
      controls.artwork.replaceChildren(image);
    } else {
      throw new Error("이미지 데이터가 응답에 포함되지 않았습니다.");
    }
    setStatus(`${titleText()} AI 도안을 만들었습니다.`);
  } catch (error) {
    createArtwork();
    setStatus(`${error.message} 빠른 SVG 샘플로 대체했습니다.`);
  } finally {
    setBusy(false);
  }
}

function serializeSvg() {
  const svg = controls.artwork.querySelector("svg");
  return new XMLSerializer().serializeToString(svg);
}

async function currentPngBlob() {
  const image = controls.artwork.querySelector("img");
  if (image) {
    return await (await fetch(image.src)).blob();
  }
  return svgToPngBlob();
}

function download(filename, href) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadSvg() {
  if (!controls.artwork.querySelector("svg")) {
    setStatus("AI 도안은 PNG로 저장해주세요. SVG 저장은 빠른 샘플에서 사용할 수 있습니다.");
    return;
  }
  const blob = new Blob([serializeSvg()], { type: "image/svg+xml;charset=utf-8" });
  download(`coloring-${Date.now()}.svg`, URL.createObjectURL(blob));
  setStatus("SVG 파일 저장을 시작했습니다.");
}

function downloadPng() {
  currentPngBlob().then((blob) => {
    download(`coloring-a4-${Date.now()}.png`, URL.createObjectURL(blob));
    setStatus("PNG 파일 저장을 시작했습니다.");
  });
}

function svgToPngBlob() {
  return new Promise((resolve) => {
    const img = new Image();
    const svgBlob = new Blob([serializeSvg()], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = A4.width;
      canvas.height = A4.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.src = url;
  });
}

async function sharePng() {
  const blob = await currentPngBlob();
  const file = new File([blob], `coloring-a4-${Date.now()}.png`, { type: "image/png" });
  const canUseShare = window.navigator && window.navigator.canShare && window.navigator.share;
  if (canUseShare && window.navigator.canShare({ files: [file] })) {
    await window.navigator.share({
      files: [file],
      title: "A4 색칠 도안",
      text: titleText(),
    });
    setStatus("공유 창을 열었습니다.");
    return;
  }
  download(`coloring-a4-${Date.now()}.png`, URL.createObjectURL(blob));
  setStatus("공유를 지원하지 않아 PNG로 저장했습니다.");
}

controls.style.addEventListener("change", createArtwork);
controls.apiKey.addEventListener("input", saveApiSettings);
controls.imageModel.addEventListener("input", saveApiSettings);
controls.rememberApiKey.addEventListener("change", saveApiSettings);
controls.theme.addEventListener("change", () => {
  if (controls.theme.value === "random") {
    currentTheme = randomThemes[Math.floor(mulberry32(Date.now())() * randomThemes.length)];
  }
  createArtwork();
});
controls.strokeWidth.addEventListener("input", createArtwork);
controls.includeTitle.addEventListener("change", createArtwork);
controls.wideMargin.addEventListener("change", createArtwork);
document.querySelectorAll("input[name='difficulty']").forEach((input) => {
  input.addEventListener("change", createArtwork);
});
controls.generateBtn.addEventListener("click", () => {
  seed = Date.now();
  currentTheme = randomThemes[Math.floor(mulberry32(seed)() * randomThemes.length)];
  createAiArtwork();
});
controls.sampleBtn.addEventListener("click", () => {
  seed = Date.now();
  currentTheme = randomThemes[Math.floor(mulberry32(seed)() * randomThemes.length)];
  createArtwork();
});
controls.downloadSvgBtn.addEventListener("click", downloadSvg);
controls.downloadPngBtn.addEventListener("click", downloadPng);
controls.shareBtn.addEventListener("click", () => {
  sharePng().catch(() => setStatus("공유가 취소되었거나 사용할 수 없습니다."));
});
controls.printBtn.addEventListener("click", () => {
  setStatus("인쇄 창을 열었습니다. PDF로 저장할 수 있습니다.");
  window.print();
});

loadApiSettings();
createArtwork();
