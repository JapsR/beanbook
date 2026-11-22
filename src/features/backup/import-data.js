/**
 * Reads a Beanbook export file and merges it into, or replaces, the current data.
 */
import { dayOf, fmtDate, localStamp } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { newId, okId } from "../../core/ids.js";
import { okDate, str } from "../../core/validate.js";
import { closeSheet, openSheet, sheetHeader } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { customs, normMethod } from "../../domain/brew-methods.js";
import { normBrew, normCoffee, okPhoto } from "../../domain/records.js";
import { SCHEMA, upgrade } from "../../domain/schema.js";
import { dropDemo } from "../../data/demo-data.js";
import { wipe } from "../../data/mutations.js";
import { coffees, state } from "../../data/state.js";
import { Store, saveMeta } from "../../data/storage.js";
import { BADGES } from "../badges/badge-definitions.js";
import { checkBadges } from "../badges/badge-progress.js";
import { go } from "../../app/router.js";

let pendingImport = null;

export async function readImport(file) {
  let o;
  try {
    o = JSON.parse(await file.text());
  } catch (e) {
    toast("That file is not a Beanbook export.");
    return;
  }
  if (!o || o.format !== "beanbook" || !Array.isArray(o.coffees) || !Array.isArray(o.brews)) {
    toast("That file is not a Beanbook export.");
    return;
  }
  (Array.isArray(o.methods) ? o.methods : []).slice(0, 40).map(normMethod).forEach(m => {
    if (m.name && !customs().some(x => x.id === m.id)) {
      state.meta.methods = [...customs(), m];
    }
  });
  const from = Math.max(1, Number(o.version) || 1);
  const map = {}, pmap = {}, photos = {};
  Object.entries(o.photos && typeof o.photos === "object" ? o.photos : {}).forEach(([id, d]) => {
    if (okPhoto(d)) {
      const nid = okId(id) ? id : newId();
      pmap[id] = nid;
      photos[nid] = d;
    }
  });
  const cs = o.coffees.slice(0, 5000).filter(c => c && str(c.name)).map(c => {
    const n = normCoffee({ ...upgrade("coffee", c, from), photoId: pmap[c.photoId] });
    map[c.id] = n.id;
    return n;
  });
  const bs = o.brews.slice(0, 20000).filter(b => b && map[b.coffeeId]).map(b => normBrew({ ...upgrade("brew", b, from), coffeeId: map[b.coffeeId], photoId: pmap[b.photoId], morePhotoIds: (Array.isArray(b.morePhotoIds) ? b.morePhotoIds : []).map(p => pmap[p]).filter(Boolean) }));
  pendingImport = { cs, bs, photos, badges: o.badges && typeof o.badges === "object" ? o.badges : {} };
  const mine = state.demo ? 0 : coffees().length;
  openSheet(`${sheetHeader("Import data")}<div class="sheet-body"><p class="hint" style="font-size:15px">This file holds <b style="color:var(--ink)">${cs.length} coffees</b> and <b style="color:var(--ink)">${bs.length} preparations</b>${Object.keys(photos).length ? ` with ${Object.keys(photos).length} photos` : ""}.</p>
  ${from > SCHEMA ? `<p class="hint">This file was made by a newer version of Beanbook. Everything is imported. Details this version does not know are kept, but not shown.</p>` : ""}
  ${o.exportedAtLocal || o.exportedAt ? `<p class="hint">Exported ${esc(fmtDate(o.exportedAtLocal || o.exportedAt))}${/T\d\d:\d\d/.test(o.exportedAtLocal || "") ? " at " + esc(o.exportedAtLocal.slice(11, 16)) : ""}.</p>` : ""}
  ${mine ? `<p class="hint">You already have ${mine} coffees here. Merge keeps them and adds the file. Replace deletes what is here first.</p>` : ""}</div>
  <div class="sheet-foot">${mine ? `<button class="btn" type="button" data-act="import-replace">Replace</button><button class="btn primary" type="button" data-act="import-merge">Merge</button>` : `<button class="btn primary" type="button" data-act="import-merge">Import</button>`}</div>`);
}

export function runImport(replace) {
  const p = pendingImport;
  pendingImport = null;
  if (!p) {
    return;
  }
  if (replace) {
    wipe();
  } else {
    dropDemo();
  }
  Object.entries(p.photos).forEach(([id, d]) => {
    state.photos[id] = d;
    Store.put("p_" + id, { k: "photo", d });
  });
  p.cs.forEach(c => {
    state.coffees[c.id] = c;
    Store.put("c_" + c.id, c);
  });
  p.bs.forEach(b => {
    state.brews[b.id] = b;
    Store.put("b_" + b.id, b);
  });
  Object.entries(p.badges).forEach(([id, x]) => {
    if (!BADGES.some(b => b.id === id) && !state.meta.badges[id] && /^[a-z0-9]{2,30}$/.test(id) && x && Number(x.level) > 0) {
      state.meta.badges[id] = { level: Number(x.level) | 0, at: okDate(x.at) };
    }
  });
  BADGES.forEach(b => {
    const x = p.badges[b.id];
    if (x && Number(x.level) > ((state.meta.badges[b.id] || {}).level || 0)) {
      state.meta.badges[b.id] = { level: Math.min(b.goals.length, Number(x.level) | 0), at: /^\d{4}-\d\d-\d\d$/.test(x.at || "") ? x.at : dayOf(localStamp()) };
    }
  });
  saveMeta();
  closeSheet();
  go("coffees");
  toast(`Imported ${p.cs.length} coffees and ${p.bs.length} preparations`);
  checkBadges(true);
}
