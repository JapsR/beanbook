#!/usr/bin/env node
/**
 * Renders docs/images/header.png, the banner at the top of README.md, from the built app.
 *
 * It opens dist/index.html in headless Chromium at phone size, screenshots three screens with the
 * built-in example coffees, and lays them out on a banner. The clock is fixed, so the image only
 * changes when the app's look changes. The publish workflow runs this on every push to main and
 * commits the image when it differs.
 *
 * Usage: node scripts/build.mjs && node scripts/readme-header.mjs
 * Needs the playwright dev dependency (npm install && npx playwright install chromium).
 */
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "docs", "images", "header.png");
const FIXED_TIME = new Date("2026-06-01T09:30:00");
const PHONE = { width: 390, height: 844 };
const BANNER = { width: 1280, height: 640 };

/* serve dist/ on a free port */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const file = normalize(join(DIST, new URL(req.url, "http://x").pathname.replace(/\/$/, "/index.html")));
  if (!file.startsWith(DIST + sep)) return res.writeHead(403).end();
  try { res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
try {
  /* 1. screenshots of the app */
  const phone = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
  const page = await phone.newPage();
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto(url);
  await page.waitForSelector(".card");
  await page.evaluate(() => document.fonts.ready);
  const snap = async () => "data:image/png;base64," + (await page.screenshot()).toString("base64");
  const screens = [];
  screens.push(await snap());                                            // coffee list
  await page.click('[data-id="coffee-demo0001"]'); await page.waitForSelector(".cover");
  screens.push(await snap());                                            // one coffee
  await page.click('[data-id="brew-demo1001"]'); await page.waitForSelector(".big-score");
  screens.push(await snap());                                            // one preparation

  /* 2. the banner */
  const banner = await browser.newPage({ viewport: BANNER, deviceScaleFactor: 1.5, colorScheme: "light" });
  await banner.setContent(`<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Hanken+Grotesk:wght@500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;width:${BANNER.width}px;height:${BANNER.height}px;overflow:hidden;font-family:"Hanken Grotesk",system-ui,sans-serif;
    background:radial-gradient(120% 90% at 85% 10%,#FFE3E8 0,#F2F5FA 55%) ;color:#0E1626;display:flex;align-items:center}
  .text{flex:none;width:430px;padding-left:72px}
  h1{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:76px;line-height:1;letter-spacing:-.03em;margin:0 0 18px}
  h1 em{font-style:normal;color:#DE2C4A}
  p{font-size:23px;line-height:1.4;color:#5C6879;margin:0;font-weight:500}
  .phones{position:relative;flex:1;height:100%}
  .phone{position:absolute;width:250px;border-radius:34px;padding:9px;background:#0E1626;box-shadow:0 30px 60px rgba(14,22,38,.22),0 8px 18px rgba(14,22,38,.12)}
  .phone img{display:block;width:100%;border-radius:26px}
  .p1{left:20px;top:120px}.p2{left:290px;top:52px;z-index:2}.p3{left:560px;top:120px}
</style></head><body>
  <div class="text"><h1>Bean<em>book</em></h1><p>Track the coffees you buy, how you brew them, and rate every cup.</p></div>
  <div class="phones">${screens.map((s, i) => `<div class="phone p${i + 1}"><img src="${s}" alt=""></div>`).join("")}</div>
</body></html>`, { waitUntil: "networkidle" });
  await banner.evaluate(() => document.fonts.ready);
  await mkdir(dirname(OUT), { recursive: true });
  await banner.screenshot({ path: OUT });
  console.log(`wrote ${OUT.slice(ROOT.length + 1)}`);
} finally {
  await browser.close();
  server.close();
}
