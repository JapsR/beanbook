#!/usr/bin/env node
/**
 * Builds dist/index.html: one self-contained file with all CSS and JavaScript inlined,
 * exactly like the hand-written single-file app it replaced, so the page still loads with
 * a single request and no module waterfall.
 *
 * No dependencies. How it works:
 *   CSS  – follows the @import list in src/styles/main.css and inlines each file in order (comments
 *          and indentation removed).
 *   JS   – walks the import graph from src/app/main.js depth-first, which is the order the browser
 *          evaluates ES modules in, then concatenates the modules with their import lines and
 *          `export` keywords removed, inside one IIFE.
 *
 * Because every module ends up in one scope, top-level names must be unique across the codebase.
 * The build fails with a clear message if two modules declare the same top-level name, or if an
 * import uses `as` renaming or a default/namespace import (none of which survive concatenation).
 *
 * Files in public/ (service worker, manifest, icons) are copied into the output unchanged.
 *
 * Usage: node scripts/build.mjs [--out dist]
 */
import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");
const outArg = process.argv.indexOf("--out");
const OUT = resolve(ROOT, outArg > -1 ? process.argv[outArg + 1] : "dist");

const fail = msg => { console.error(`\n  build failed: ${msg}\n`); process.exit(1); };
const rel = p => relative(ROOT, p);

/* ---------- CSS ---------- */
function collectCss(file, seen = new Set()) {
  if (seen.has(file)) return "";
  seen.add(file);
  let css;
  try { css = readFileSync(file, "utf8"); } catch { fail(`cannot read ${rel(file)}`); }
  return css.replace(/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)\s*;|@import\s+["']([^"']+)["']\s*;/g,
    (_, a, b) => collectCss(resolve(dirname(file), a || b), seen));
}
const minifyCss = css => css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{};])\s*/g, "$1")
  .replace(/;}/g, "}")
  .replace(/([{;])\s*([\w-]+)\s*:\s+/g, "$1$2:")
  .trim();

/* ---------- JavaScript ---------- */
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?[ \t]*\n?/gm;
const modules = [];           // in evaluation order
const state = new Map();      // file -> "visiting" | "done"

function visit(file) {
  if (state.has(file)) return;
  state.set(file, "visiting");
  let code;
  try { code = readFileSync(file, "utf8"); } catch { fail(`cannot read ${rel(file)}`); }
  if (/^\s*import\s+(?!\{)/m.test(code)) fail(`${rel(file)}: only "import { a, b } from './x.js'" is supported`);
  if (/^\s*export\s+(default|\{|\*)/m.test(code)) fail(`${rel(file)}: use "export const|function", not default or list exports`);
  for (const [, names, spec] of code.matchAll(IMPORT_RE)) {
    if (/\bas\b/.test(names)) fail(`${rel(file)}: "import { x as y }" is not supported`);
    visit(resolve(dirname(file), spec));
  }
  modules.push({ file, code });
  state.set(file, "done");
}

function topLevelNames(code) {
  const names = [];
  for (const m of code.matchAll(/^(?:export\s+)?(?:async\s+)?(?:const|let|var|function\*?|class)\s+([\w$]+)/gm)) names.push(m[1]);
  return names;
}

function bundleJs(entry) {
  visit(entry);
  const owner = new Map();
  for (const { file, code } of modules) {
    for (const n of topLevelNames(code)) {
      if (owner.has(n)) fail(`"${n}" is declared at top level in both ${rel(owner.get(n))} and ${rel(file)}`);
      owner.set(n, file);
    }
  }
  const body = modules.map(({ file, code }) =>
    `// ${relative(SRC, file)}\n` + code.replace(IMPORT_RE, "").replace(/^export\s+/gm, "").trim()
  ).join("\n\n");
  return `(() => {\n"use strict";\n${body}\n})();`;
}

/* ---------- HTML ---------- */
let html = readFileSync(join(SRC, "index.html"), "utf8");
const block = name => new RegExp(`<!-- build:${name} -->[\\s\\S]*?<!-- /build:${name} -->`);
if (!block("css").test(html) || !block("js").test(html)) fail("src/index.html is missing a build:css or build:js block");

const cssHref = html.match(block("css"))[0].match(/href="([^"]+)"/)[1];
const jsSrc = html.match(block("js"))[0].match(/src="([^"]+)"/)[1];
const css = minifyCss(collectCss(join(SRC, cssHref)));
const js = bundleJs(join(SRC, jsSrc));

html = html
  .replace(block("css"), () => `<style>${css}</style>`)
  .replace(block("js"), () => `<script>\n${js}\n</script>`);

mkdirSync(OUT, { recursive: true });
if (existsSync(PUBLIC)) cpSync(PUBLIC, OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), html);
const kb = n => (n / 1024).toFixed(1) + " KB";
console.log(`built ${rel(join(OUT, "index.html"))}: ${modules.length} modules, ${kb(Buffer.byteLength(html))} (css ${kb(css.length)}, js ${kb(js.length)})`);
