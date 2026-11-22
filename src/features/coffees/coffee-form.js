/**
 * The add / edit coffee form and saving it.
 */
import { dayOf, localStamp } from "../../core/dates.js";
import { $, esc } from "../../core/dom.js";
import { newId } from "../../core/ids.js";
import { str } from "../../core/validate.js";
import { seg } from "../../ui/components.js";
import { fieldType } from "../../ui/field-types.js";
import { closeSheet, openSheet, sheetHeader } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { NOTES_MAX, moreOn, normCoffee } from "../../domain/records.js";
import { ORIGINS, PROCESSES, ROASTN, ROASTV } from "../../domain/vocabulary.js";
import { dropDemo } from "../../data/demo-data.js";
import { coffees, state } from "../../data/state.js";
import { Store } from "../../data/storage.js";
import { checkBadges } from "../badges/badge-progress.js";
import { applyPhoto, photoField, setFormPhotos } from "../photos/photo-field.js";
import { render } from "../../app/render.js";
import { go } from "../../app/router.js";

const procList = cur => [...new Set([...PROCESSES, ...coffees().filter(x => !x.demo).map(x => x.process), cur || ""])];

export function coffeeForm(c) {
  c = c || { form: "beans", roast: "", bought: dayOf(localStamp()) };
  setFormPhotos(c.photoId ? [c.photoId] : [], false);
  openSheet(`${sheetHeader(c.id ? "Edit coffee" : "New coffee")}<form id="coffee-form" data-id="${c.id || ""}" novalidate><div class="sheet-body">
  ${photoField()}
  <div class="f"><label for="c-name">Name</label><input id="c-name" name="name" type="text" required maxlength="80" placeholder="e.g. Guji Hambela" value="${esc(c.name)}" autocomplete="off"></div>
  <div class="grid2"><div class="f"><label for="c-roaster">Roaster</label><input id="c-roaster" name="roaster" type="text" maxlength="60" list="dl-roasters" value="${esc(c.roaster)}" autocomplete="off"></div>
    <div class="f"><label for="c-origin">Origin</label><input id="c-origin" name="origin" type="text" maxlength="60" list="dl-origins" value="${esc(c.origin)}" autocomplete="off"></div></div>
  <datalist id="dl-origins">${ORIGINS.map(o => `<option value="${o}">`).join("")}</datalist>
  <datalist id="dl-roasters">${[...new Set(coffees().filter(x => !x.demo).map(x => x.roaster).filter(Boolean))].map(o => `<option value="${esc(o)}">`).join("")}</datalist>
  <div class="f"><span class="lbl">Bought as</span>${seg("form", [["beans", "Whole beans"], ["ground", "Ground"]], c.form)}</div>
  <div class="f"><div class="roast-top"><label for="c-roast">Roast</label><output id="c-roast-out" for="c-roast">${ROASTN[Math.max(0, ROASTV.indexOf(c.roast || ""))]}</output></div>
    <input class="roast" id="c-roast" name="roastIdx" type="range" min="0" max="5" step="1" value="${Math.max(0, ROASTV.indexOf(c.roast || ""))}" aria-valuetext="${ROASTN[Math.max(0, ROASTV.indexOf(c.roast || ""))]}">
    <div class="roast-ticks" aria-hidden="true"><span style="left:0">Unknown</span><span style="left:20%">Light</span><span style="left:60%">Medium</span><span style="left:100%">Dark</span></div></div>
  <div class="grid2"><div class="f"><label for="c-process">Process</label><select id="c-process" name="process">${procList(c.process).map(p => `<option value="${esc(p)}" ${(c.process || "") === p ? "selected" : ""}>${esc(p || "Not sure")}</option>`).join("")}<option value="__custom">Custom…</option></select></div>
    <div class="f"><label for="c-roastdate">Roast date</label><input id="c-roastdate" name="roastDate" type="date" value="${esc(c.roastDate)}"></div></div>
  <div class="f" id="c-process-box" hidden><label for="c-process-custom">Custom process</label><input id="c-process-custom" name="processCustom" type="text" maxlength="40" placeholder="e.g. Yeast-inoculated natural" autocomplete="off"></div>
  <label class="tick"><input type="checkbox" id="c-more" ${moreOn(c) ? "checked" : ""}><span>Show more details</span></label>
  <div id="c-more-box" ${moreOn(c) ? "" : "hidden"}>
    <div class="grid2"><div class="f"><label for="c-region">Region</label><input id="c-region" name="region" type="text" maxlength="60" placeholder="e.g. Pitalito, Huila" value="${esc(c.region)}" autocomplete="off"></div>
    <div class="f"><label for="c-producer">Producer or farm</label><input id="c-producer" name="producer" type="text" maxlength="60" value="${esc(c.producer)}" autocomplete="off"></div></div>
    <div class="grid2"><div class="f"><label for="c-variety">Variety</label><input id="c-variety" name="variety" type="text" maxlength="60" placeholder="e.g. Caturra, Chiroso" value="${esc(c.variety)}" autocomplete="off"></div>
    <div class="f"><label for="c-altitude">Altitude (m)</label><input id="c-altitude" name="altitude" type="text" ${fieldType("integer")} maxlength="4" value="${c.altitude ?? ""}"></div></div>
    <div class="f"><span class="lbl">Roasted for</span>${seg("roastFor", [["", "Not sure"], ["filter", "Filter"], ["espresso", "Espresso"], ["omni", "Both"]], c.roastFor || "")}</div>
    <div class="f"><label for="c-rnotes">Roaster's tasting notes</label><input id="c-rnotes" name="roasterNotes" type="text" maxlength="120" placeholder="What the bag promises" value="${esc(c.roasterNotes)}" autocomplete="off"></div>
  </div>
  <div class="grid3"><div class="f"><label for="c-bought">Bought</label><input id="c-bought" name="bought" type="date" value="${esc(c.bought)}"></div>
    <div class="f"><label for="c-weight">Bag (g)</label><input id="c-weight" name="weight" type="text" ${fieldType("decimal")} value="${c.weight ?? ""}" placeholder="250"></div>
    <div class="f"><label for="c-price">Price (€)</label><input id="c-price" name="price" type="text" ${fieldType("decimal")} value="${c.price ?? ""}"></div></div>
  <div class="f"><label for="c-notes">Notes</label><textarea id="c-notes" name="notes" rows="5" maxlength="${NOTES_MAX}" placeholder="What the bag says, where you bought it…">${esc(c.notes)}</textarea><p class="hint">Markdown works: **bold**, *italic*, - lists, [links](https://…)</p></div>
  </div><div class="sheet-foot"><button class="btn primary" type="submit">${c.id ? "Save changes" : "Add coffee"}</button></div></form>`);
  if (!c.id) {
    setTimeout(() => $("#c-name") && $("#c-name").focus(), 260);
  }
}

export function saveCoffee(f) {
  const fd = new FormData(f), old = state.coffees[f.dataset.id];
  if (!str(fd.get("name"))) {
    toast("Give the coffee a name first.");
    f.name.focus();
    return;
  }
  if (!old && state.demo) {
    dropDemo();
    toast("Examples cleared. This is your shelf now.");
  }
  const c = normCoffee({
    ...(old || {}), id: old ? old.id : newId(), name: fd.get("name"), roaster: fd.get("roaster"), origin: fd.get("origin"), form: fd.get("form"), roast: ROASTV[Number(fd.get("roastIdx")) || 0],
    process: fd.get("process") === "__custom" ? fd.get("processCustom") : fd.get("process"), region: fd.get("region"), producer: fd.get("producer"), variety: fd.get("variety"), altitude: fd.get("altitude"), roastFor: fd.get("roastFor"), roasterNotes: fd.get("roasterNotes"), roastDate: fd.get("roastDate"), bought: fd.get("bought"), weight: fd.get("weight"), price: fd.get("price"), notes: fd.get("notes")
  });
  applyPhoto(old, c);
  state.coffees[c.id] = c;
  Store.put("c_" + c.id, c);
  closeSheet();
  if (old) {
    render();
  } else {
    go("coffee-" + c.id);
  }
  checkBadges();
}
