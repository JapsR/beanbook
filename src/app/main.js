/**
 * Entry point: bind events, load stored data, then draw the first page.
 */
import { loadDemo } from "../data/demo-data.js";
import { hydrate } from "../data/hydrate.js";
import { coffees, state } from "../data/state.js";
import { Store } from "../data/storage.js";
import { checkBadges } from "../features/badges/badge-progress.js";
import { bindEvents } from "./events.js";
import { render, view } from "./render.js";
import { setCurrentRoute } from "./router.js";

export async function boot() {
  view.innerHTML = `<div class="loading"><p>Opening your coffee shelf…</p></div>`;
  const docs = await Store.init();
  if (docs === null) {
    view.innerHTML = `<div class="loading"><div class="empty"><h3>Your data can't be reached yet</h3><p>Check your connection and try again. Nothing has been lost.</p><button class="btn primary" type="button" data-act="retry">Try again</button></div></div>`;
    return;
  }
  hydrate(docs);
  if (!coffees().length && !state.meta.demoOff) {
    loadDemo();
  }
  const h = location.hash.slice(1);
  if (h) {
    setCurrentRoute(h);
  }
  state.ready = true;
  checkBadges(true);
  render(true);
}

bindEvents();
boot();

/* Ask the browser not to evict our IndexedDB data, and enable offline use (public/sw.js). */
try {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }
} catch (e) {
}
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { });
}
