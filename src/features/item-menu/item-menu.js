/**
 * The menu that opens on a long press (or right-click) on a coffee or a preparation in a list.
 * Coffees: duplicate (without preparations) and delete. Preparations: delete.
 * Deleting asks for confirmation first, through the same sheets as the delete buttons on the detail pages.
 */
import { fmtDay } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { icon } from "../../ui/icons.js";
import { closeSheet, openSheet, sheetHeader } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { methodById } from "../../domain/brew-methods.js";
import { duplicateCoffee } from "../../data/mutations.js";
import { state } from "../../data/state.js";
import { checkBadges } from "../badges/badge-progress.js";
import { render } from "../../app/render.js";

/* Elements the menu opens on: list cards that link to a coffee or a preparation. */
export const ITEM_MENU_TARGETS = '.card[data-act="open"][data-id^="coffee-"], .card[data-act="open"][data-id^="brew-"]';

const menuItem = (act, id, ic, label, danger) => `<button class="menu-item${danger ? " danger" : ""}" type="button" data-act="${act}" data-id="${id}">${icon(ic, 20)}<span>${label}</span></button>`;

export function openItemMenu(el) {
  const ref = el.dataset.id;
  if (ref.startsWith("coffee-")) {
    const c = state.coffees[ref.slice(7)];
    if (!c) {
      return;
    }
    if (c.demo) {
      toast("Example coffees can't be changed");
      return;
    }
    openSheet(`${sheetHeader(esc(c.name))}<div class="sheet-body"><div class="menu" role="menu">
      ${menuItem("dup-coffee", c.id, "layers", "Duplicate")}<p class="hint menu-hint">Makes a copy with the same details and photo, without the preparations.</p>
      ${menuItem("ask-del-coffee", c.id, "trash", "Delete", true)}</div></div>`, { pop: true });
  } else {
    const b = state.brews[ref.slice(5)];
    if (!b) {
      return;
    }
    if (b.demo) {
      toast("Example preparations can't be changed");
      return;
    }
    const c = state.coffees[b.coffeeId];
    openSheet(`${sheetHeader(esc(`${methodById(b.method).name} · ${fmtDay(b.date)}`))}<div class="sheet-body">${c ? `<p class="hint">${esc(c.name)}</p>` : ""}<div class="menu" role="menu">
      ${menuItem("ask-del-brew", b.id, "trash", "Delete", true)}</div></div>`, { pop: true });
  }
}

export const itemMenuActions = {
  "dup-coffee": id => {
    const copy = duplicateCoffee(id);
    closeSheet();
    if (copy) {
      render();
      toast("Coffee duplicated");
      checkBadges();
    }
  }
};
