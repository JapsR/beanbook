/**
 * Advanced brew fields: pouring stages and per-method extra options.
 */
import { esc } from "../../core/dom.js";
import { fieldType } from "../../ui/field-types.js";
import { icon } from "../../ui/icons.js";
import { ADV, methodById } from "../../domain/brew-methods.js";

let stageN = 0;

export const stageRow = x => {
  const n = ++stageN;
  x = x || {};
  return `<div class="stage"><input id="st-t-${n}" name="st-t" type="text" ${fieldType("duration")} maxlength="8" placeholder="0:45" aria-label="Start time" value="${esc(x.t)}"><input id="st-g-${n}" name="st-g" type="text" ${fieldType("decimal")} placeholder="g" aria-label="Pour to grams" value="${x.g ?? ""}"><input id="st-n-${n}" name="st-n" type="text" maxlength="40" placeholder="Bloom, swirl…" aria-label="Stage note" value="${esc(x.note)}"><button class="ib" type="button" data-act="stage-del" aria-label="Remove stage">${icon("close", 18)}</button></div>`;
};

export function extrasBox(mid, ex) {
  const m = methodById(mid), defs = ADV[m.id];
  if (!defs) {
    return "";
  }
  return `<details class="adv" open><summary>Advanced: ${esc(m.name)} options</summary><div class="adv-body"><div class="grid2">${defs.map(d => d.t === "seg"
    ? `<div class="f wide"><span class="lbl">${d.l}</span><div class="seg">${["", ...d.o].map((o, i) => `<label><input type="radio" name="ex-${d.k}" id="ex-${d.k}-${i}" value="${o}" ${(ex[d.k] || "") === o ? "checked" : ""}><span>${o || "Not set"}</span></label>`).join("")}</div></div>`
    : `<div class="f"><label for="ex-${d.k}">${d.l}</label><input id="ex-${d.k}" name="ex-${d.k}" type="text" ${fieldType(d.t === "num" ? "decimal" : d.t === "dur" ? "duration" : "")} maxlength="20" placeholder="${d.ph || ""}" value="${esc(ex[d.k] ?? "")}"></div>`).join("")}</div></div></details>`;
}
