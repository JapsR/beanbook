/**
 * The add / edit preparation form and saving it.
 */
import { localStamp } from "../../core/dates.js";
import { $, esc } from "../../core/dom.js";
import { fmtNum, fmtRate } from "../../core/format.js";
import { newId } from "../../core/ids.js";
import { num, str } from "../../core/validate.js";
import { pips } from "../../ui/components.js";
import { fieldType } from "../../ui/field-types.js";
import { icon } from "../../ui/icons.js";
import { closeSheet, openSheet, sheetHeader } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { ADV, MCOLORS, METHODS, allMethods, customs, methodById, normMethod } from "../../domain/brew-methods.js";
import { NOTES_MAX, normBrew } from "../../domain/records.js";
import { FLAVORS } from "../../domain/vocabulary.js";
import { brewsOf, state } from "../../data/state.js";
import { Store, saveMeta } from "../../data/storage.js";
import { checkBadges } from "../badges/badge-progress.js";
import { extrasBox, stageRow } from "./brew-advanced-fields.js";
import { pauseTimer, resetTimer, timerBox, timerMethodChanged } from "./brew-timer.js";
import { applyPhoto, photoField, setFormPhoto } from "../photos/photo-field.js";
import { render } from "../../app/render.js";
import { go } from "../../app/router.js";

export function brewForm(coffeeId, b, copy) {
  const c = state.coffees[coffeeId];
  if (!c) {
    return;
  }
  const last = brewsOf(coffeeId)[0];
  const editing = b && !copy;
  let v;
  if (editing) {
    v = { ...b };
  } else {
    const src = b || last;
    const m = src ? methodById(src.method) : METHODS[c.form === "ground" ? 6 : 1];
    v = src ? {
      method: src.method, dose: src.dose, water: src.water, temp: src.temp, time: src.time, grind: src.grind, flavors: [], stages: (src.stages || []).map(x => ({ ...x })), extra: { ...(src.extra || {}) }
    } : {
      method: m.id, dose: m.dose, water: m.water, temp: m.temp, time: m.time, grind: "", flavors: [], stages: [], extra: {}
    };
    v.date = localStamp();
    v.rating = null;
    v.notes = "";
  }
  resetTimer();
  setFormPhoto(editing && v.photoId ? state.photos[v.photoId] || null : null, false);
  const r = v.rating || 0;
  openSheet(`${sheetHeader(editing ? "Edit preparation" : "New preparation")}<form id="brew-form" data-id="${editing ? b.id : ""}" data-coffee="${coffeeId}" novalidate><div class="sheet-body">
  <p class="hint"><b style="color:var(--ink)">${esc(c.name)}</b>${!editing && (b || last) ? " · recipe copied from your last cup" : ""}</p>
  <div class="f"><span class="lbl">Method</span><div class="opts" id="method-opts">${allMethods().map(m => methodOpt(m, v.method === m.id)).join("")}<button class="opt-add" type="button" data-act="new-method" id="new-method-btn">+ Custom</button></div>
    <div class="adv-body" id="new-method-row" style="padding:0" hidden><div class="add-row"><input id="new-method-name" type="text" maxlength="30" placeholder="e.g. Hario Switch" aria-label="Name of your brew method" autocomplete="off"><button class="btn small primary" type="button" data-act="add-method">Add</button></div>
    <div class="opts"><label class="opt"><input type="checkbox" id="new-method-pour"><span>This method has pouring stages</span></label></div></div></div>
  <div class="grid3"><div class="f"><label for="b-dose">Coffee (g)</label><input id="b-dose" name="dose" type="text" ${fieldType("decimal")} value="${v.dose ?? ""}"></div>
    <div class="f"><label for="b-water" id="b-water-lbl">${methodById(v.method).out || "Water"} (g)</label><input id="b-water" name="water" type="text" ${fieldType("decimal")} value="${v.water ?? ""}"></div>
    <div class="f"><label for="b-temp">Temp (°C)</label><input id="b-temp" name="temp" type="text" ${fieldType("decimal")} value="${v.temp ?? ""}"></div></div>
  <p class="hint" id="ratio-line"></p>
  <div class="f"><label for="b-grind">Grind setting</label><input id="b-grind" name="grind" type="text" maxlength="40" placeholder="${c.form === "ground" ? "Pre-ground" : "e.g. 22 clicks"}" value="${esc(v.grind)}"></div>
  ${timerBox(v.time, v.method)}
  ${(() => {
    const m = methodById(v.method), has = m.pour || ADV[m.id], on = (m.pour && (v.stages || []).length) || Object.keys(v.extra || {}).length;
    return `<label class="tick" id="adv-tick" ${has ? "" : "hidden"}><input type="checkbox" id="adv-toggle" ${on ? "checked" : ""}><span>Show advanced options</span></label><div id="adv-wrap" ${has && on ? "" : "hidden"}>`;
  })()}
  <details class="adv" id="stages" open ${methodById(v.method).pour ? "" : "hidden"}><summary>Advanced: pouring stages</summary><div class="adv-body">
    <div class="stage hd"><span>Start</span><span>Pour to</span><span>Note</span><span></span></div>
    <div class="adv-body" id="stage-list" style="padding:0">${(v.stages || []).map(stageRow).join("")}</div>
    <div class="row-btns"><button class="btn small" type="button" data-act="stage-add">${icon("plus", 18)}Add stage</button><button class="btn small ghost" type="button" data-act="stage-preset">Bloom + 2 pours</button></div>
    <p class="hint">Start time of each pour and the total grams on the scale when it ends.</p></div></details>
  <div id="extras-box">${extrasBox(v.method, v.extra || {})}</div></div>
  <div class="rate"><div class="rate-top"><div><div class="lbl" style="font-size:12.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Rating</div><output id="rate-out" for="b-rating" class="num">${r ? fmtRate(r) : "–"}</output></div><span id="rate-pips">${pips(r || null)}</span></div>
    <input id="b-rating" name="rating" type="range" min="0" max="5" step="0.25" value="${r}" style="--p:${r * 20}%" aria-label="Rating from 0 to 5 in quarter steps"><p class="hint">Slide to rate in quarter steps. Leave at zero to rate later.</p></div>
  <div class="f"><span class="lbl">Tasting notes</span><div class="opts">${[...FLAVORS, ...v.flavors.filter(f => !FLAVORS.includes(f))].map((f, i) => `<label class="opt"><input type="checkbox" name="flavors" id="fl-${i}" value="${esc(f)}" ${v.flavors.includes(f) ? "checked" : ""}><span>${esc(f)}</span></label>`).join("")}</div></div>
  <div class="f"><label for="b-notes">In your own words</label><textarea id="b-notes" name="notes" rows="5" maxlength="${NOTES_MAX}" placeholder="What worked, what to change next time…">${esc(v.notes)}</textarea><p class="hint">Markdown works: **bold**, *italic*, - lists, [links](https://…)</p></div>
  ${photoField()}
  <div class="f"><label for="b-date">When</label><input id="b-date" name="date" type="datetime-local" value="${esc(v.date)}"></div>
  </div><div class="sheet-foot"><button class="btn primary" type="submit">${editing ? "Save changes" : "Save preparation"}</button></div></form>`);
  updRatio();
}

const methodOpt = (m, on) => `<label class="opt" style="--mc:${m.c}"><input type="radio" name="method" id="m-${m.id}" value="${m.id}" ${on ? "checked" : ""}><span>${esc(m.name)}</span></label>`;

export function methodChanged(id) {
  const m = methodById(id);
  $("#b-water-lbl").textContent = (m.out || "Water") + " (g)";
  $("#stages").hidden = !m.pour;
  $("#extras-box").innerHTML = extrasBox(id, {});
  const has = !!(m.pour || ADV[m.id]);
  $("#adv-tick").hidden = !has;
  $("#adv-wrap").hidden = !has || !$("#adv-toggle").checked;
  timerMethodChanged(id);
}

export function addMethod() {
  const inp = $("#new-method-name");
  if (!inp) {
    return;
  }
  const name = str(inp.value, 30);
  if (!name) {
    inp.focus();
    return;
  }
  let m = allMethods().find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!m) {
    m = normMethod({ name, c: MCOLORS[customs().length % MCOLORS.length], pour: $("#new-method-pour").checked });
    state.meta.methods = [...customs(), m];
    saveMeta();
    $("#new-method-btn").insertAdjacentHTML("beforebegin", methodOpt(m, false));
  }
  const r = $("#m-" + m.id);
  if (r) {
    r.checked = true;
    methodChanged(m.id);
  }
  inp.value = "";
  $("#new-method-pour").checked = false;
  $("#new-method-row").hidden = true;
}

export function updRatio() {
  const f = $("#brew-form");
  if (!f) {
    return;
  }
  const d = num(f.dose.value, 0.1, 5000), w = num(f.water.value, 1, 50000);
  $("#ratio-line").innerHTML = d && w ? `Ratio <span class="ratio num">1:${fmtNum(w / d, 1)}</span>` : "Fill in coffee and water to see the ratio.";
}

export function saveBrew(f) {
  pauseTimer();   // saving while the timer runs keeps the time on the clock
  const fd = new FormData(f), old = state.brews[f.dataset.id], cid = f.dataset.coffee;
  if (!state.coffees[cid]) {
    return;
  }
  const b = normBrew({
    ...(old || {}), id: old ? old.id : newId(), coffeeId: cid, method: fd.get("method"), date: fd.get("date"), dose: fd.get("dose"), water: fd.get("water"), temp: fd.get("temp"),
    time: fd.get("time"), grind: fd.get("grind"), stages: methodById(fd.get("method")).pour ? fd.getAll("st-t").map((t, i) => ({ t, g: fd.getAll("st-g")[i], note: fd.getAll("st-n")[i] })) : [],
    extra: Object.fromEntries((ADV[methodById(fd.get("method")).id] || []).map(d => [d.k, fd.get("ex-" + d.k)])), rating: Number(fd.get("rating")) || null, flavors: fd.getAll("flavors"), notes: fd.get("notes")
  });
  applyPhoto(old, b);
  state.brews[b.id] = b;
  Store.put("b_" + b.id, b);
  closeSheet();
  if (old) {
    render();
  } else {
    go("coffee-" + cid);
    toast("Preparation saved");
  }
  checkBadges();
}
