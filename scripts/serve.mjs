#!/usr/bin/env node
/**
 * Tiny static file server for development. No dependencies.
 *
 *   node scripts/serve.mjs            serves src/ plus public/ (ES modules straight from source, no build step)
 *   node scripts/serve.mjs --dist     serves dist/ (the built single file, as it is published)
 *   PORT=8080 node scripts/serve.mjs  pick another port (default 5173)
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.argv.includes("--dist");
const ROOTS = DIST ? [join(BASE, "dist")] : [join(BASE, "src"), join(BASE, "public")];
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  for (const root of ROOTS) {
    const file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
      return;
    } catch { /* try the next root */ }
  }
  res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
}).listen(PORT, () => console.log(`Beanbook: http://localhost:${PORT}  (serving ${ROOTS.join(" + ")})`));
