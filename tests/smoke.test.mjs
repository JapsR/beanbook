/**
 * End-to-end smoke test of the built app (dist/index.html) in headless Chromium.
 * Run with `npm test` (builds first). Needs the playwright dev dependency:
 *   npm install && npx playwright install chromium
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const html = await readFile(new URL("../dist/index.html", import.meta.url));
const server = createServer((req, res) => res.writeHead(200, { "Content-Type": "text/html" }).end(html));
await new Promise(r => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

test("add a coffee and a preparation, export, reload and import", async t => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  t.after(async () => { await browser.close(); server.close(); });
  const page = await (await browser.newContext({ acceptDownloads: true, reducedMotion: "reduce" })).newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto(url);
  await page.waitForSelector(".card");
  assert.equal(await page.locator(".tag.demo").count(), 3, "example coffees are shown on first run");

  // new coffee
  await page.click("#fab");
  await page.fill("#c-name", "Test Bean");
  await page.fill("#c-roaster", "Roastery X");
  await page.locator("#c-roast").fill("4");
  await page.click("#coffee-form button[type=submit]");
  await page.waitForSelector(".cover h1:has-text('Test Bean')");
  if (await page.$(".sheet .won")) await page.click(".sheet [data-act=close-sheet]");

  // new preparation with advanced options
  await page.click("#fab");
  await page.click("label:has(#m-v60)");
  await page.click("label:has(#adv-toggle)");
  await page.click("[data-act=stage-preset]");
  // brew timer: pausing fills in the brew time, Pour fills the planned stage start times in order
  await page.click("#bt-toggle");
  await page.waitForTimeout(1100);
  await page.click("#bt-pour");
  await page.click("#bt-toggle");
  assert.match(await page.inputValue("#b-time"), /^0:0[1-2]$/);
  assert.match(await page.inputValue("#stage-list .stage:first-child [name=st-t]"), /^0:0[1-2]$/);
  await page.locator("#b-rating").fill("4.25");
  await page.click("#brew-form button[type=submit]");
  await page.waitForSelector(".preps .card");
  if (await page.$(".sheet .won")) await page.click(".sheet [data-act=close-sheet]");
  assert.match(await page.textContent(".preps .card"), /4\.25/);

  // export
  await page.click("[data-act=tab][data-id=data]");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("[data-act=export]")]);
  const file = join(tmpdir(), download.suggestedFilename());
  await download.saveAs(file);
  const data = JSON.parse(await readFile(file, "utf8"));
  assert.equal(data.format, "beanbook");
  assert.equal(data.coffees.length, 1);
  assert.equal(data.brews[0].stages.length, 3);
  assert.match(download.suggestedFilename(), /^beanbook-\d{4}-\d\d-\d\d-\d{4}\.json$/);

  // data survives a reload
  await page.reload();
  await page.click("[data-act=tab][data-id=coffees]");
  await page.waitForSelector(".card:has-text('Test Bean')");

  // import merges the file back in
  await page.click("[data-act=tab][data-id=data]");
  await page.setInputFiles("#import-file", file);
  await page.click("[data-act=import-merge]");
  await page.waitForSelector(".card:has-text('Test Bean')");

  assert.deepEqual(errors, []);
});
