/**
 * Bottom sheets on phones, centred dialogs on wide screens.
 */
import { $, esc } from "../core/dom.js";
import { icon } from "./icons.js";

export const sheetRoot = $("#sheet-root");

export function openSheet(html, o = {}) {
  sheetRoot.innerHTML = `<div class="scrim" data-act="close-sheet"></div><section class="sheet ${o.pop ? "pop" : ""}" role="dialog" aria-modal="true">${html}</section>`;
  sheetRoot.classList.add("open");
}

export function closeSheet() {
  sheetRoot.classList.remove("open");
  sheetRoot.innerHTML = "";
}

export function confirmSheet(title, text, label, act, id) {
  openSheet(`<div class="sheet-head"><h2>${esc(title)}</h2></div><div class="sheet-body"><p class="hint" style="font-size:15px">${esc(text)}</p></div>
  <div class="sheet-foot"><button class="btn" type="button" data-act="close-sheet">Cancel</button><button class="btn primary" type="button" data-act="${act}" data-id="${id || ""}">${esc(label)}</button></div>`);
}

export const sheetHeader = t => `<div class="sheet-head"><h2>${t}</h2><button class="ib" type="button" data-act="close-sheet" aria-label="Close">${icon("close")}</button></div>`;
