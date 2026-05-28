const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { generateImage: requestImageGeneration } = require("./lib/generate");

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

async function handleGenerateImage(req, res) {
  const body = await readJson(req);
  try {
    const result = await requestImageGeneration(body);
    send(res, 200, JSON.stringify(result), { "content-type": "application/json; charset=utf-8" });
  } catch (error) {
    send(res, error.status || 500, JSON.stringify({ error: error.message || "서버 오류가 발생했습니다." }), {
      "content-type": "application/json; charset=utf-8",
    });
  }
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
    handleGenerateImage(req, res).catch((error) => {
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
