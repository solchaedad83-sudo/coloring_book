const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4174);
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
};

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const themePrompts = {
  cozyInterior: "a cozy adult coloring book interior scene with a reading nook, plants, patterned rug, tea set, shelves, cushions, framed art, and many small decorative objects",
  botanicalPortrait: "an elegant adult coloring book portrait surrounded by detailed botanical leaves, flowers, vines, hair ornaments, fabric folds, and delicate jewelry",
  vintageMarket: "a vintage European market stall scene with fruit baskets, flowers, jars, awnings, handwritten signs, cobblestones, and layered shop details",
  cityCafe: "a charming city cafe street scene with terrace tables, windows, bicycles, signs, plants, paving stones, and architectural details",
  fantasyLibrary: "a fantasy library scene with tall bookshelves, candles, magical bottles, ornate furniture, maps, keys, plants, and hidden tiny objects",
  ornamentalAnimal: "a majestic animal portrait filled with ornamental patterns, botanical borders, feathers, gems, paisley details, and symmetrical decorative linework",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function buildPrompt({ theme, difficulty, style, wideMargin, includeTitle }) {
  const subject =
    theme === "random"
      ? Object.values(themePrompts)[Math.floor(Math.random() * Object.values(themePrompts).length)]
      : themePrompts[theme] || themePrompts.cozyInterior;

  const density = {
    easy: "simple relaxing adult coloring page, large open closed areas, only 8 to 12 main objects, minimal background detail, no dense texture, no tiny repeated filler",
    medium: "moderate adult coloring detail, clear closed areas, about 20 to 35 objects and ornaments, some background detail but not crowded",
    hard: "intricate adult coloring book detail, many closed areas and layered background objects, but keep the composition readable and avoid chaotic clutter",
  }[difficulty || "medium"];

  const composition = {
    center: "clear central composition with one strong focal subject and generous breathing room",
    scene:
      difficulty === "easy"
        ? "simple scene with a focal subject and a few supporting objects"
        : "full-page scene with foreground, middle ground, and background details",
    pattern:
      difficulty === "easy"
        ? "simple ornamental pattern with large repeated shapes"
        : "ornamental repeating composition with a premium coloring book feel",
  }[style || "scene"];

  return [
    difficulty === "easy"
      ? "Create a clean, relaxing printable adult coloring book page."
      : "Create a premium printable adult coloring book page.",
    subject,
    composition,
    density,
    wideMargin ? "Keep a clean printable margin around the artwork." : "Use the page generously while keeping print-safe edges.",
    includeTitle ? "No large title text inside the artwork; avoid readable words except tiny decorative signage." : "No text, letters, logos, signatures, or watermarks.",
    "Style: clean black and white line art only, white background, no color, no grayscale, no shading, no filled black areas, no heavy scribbles.",
    difficulty === "easy"
      ? "Quality target: polished commercial coloring book linework, coherent objects, simple elegant closed shapes, easy to color on iPad without overwhelming detail."
      : "Quality target: polished commercial coloring book linework like a detailed printable page, coherent objects, elegant closed shapes, consistent thin outlines, suitable for A4 printing and iPad coloring.",
  ].join(" ");
}

async function generateImage(req, res) {
  const body = await readJson(req);
  const apiKey = body.apiKey || req.headers["x-openai-api-key"];
  if (!apiKey) {
    send(
      res,
      503,
      JSON.stringify({
        error: "설정창에 OpenAI API Key를 입력해야 AI 도안을 만들 수 있습니다.",
      }),
      { "content-type": "application/json; charset=utf-8" },
    );
    return;
  }

  const prompt = buildPrompt(body);
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: body.imageModel || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      prompt,
      size: "1024x1536",
      quality: body.difficulty === "hard" ? "high" : "medium",
      output_format: "png",
      n: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    send(res, response.status, JSON.stringify({ error: data.error?.message || "이미지 생성에 실패했습니다." }), {
      "content-type": "application/json; charset=utf-8",
    });
    return;
  }

  send(
    res,
    200,
    JSON.stringify({
      image: `data:image/png;base64,${data.data?.[0]?.b64_json}`,
      prompt,
    }),
    { "content-type": "application/json; charset=utf-8" },
  );
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, data, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") {
    generateImage(req, res).catch((error) => {
      send(res, 500, JSON.stringify({ error: error.message || "서버 오류가 발생했습니다." }), {
        "content-type": "application/json; charset=utf-8",
      });
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Coloring app server: http://localhost:${PORT}`);
});
