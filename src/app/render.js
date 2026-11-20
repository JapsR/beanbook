/**
 * Draws the current page, the navigation tabs and the floating action button.
 */
import { $, esc } from "../core/dom.js";
import { icon } from "../ui/icons.js";
import { coffees, state } from "../data/state.js";
import { dataPage } from "../features/backup/data-page.js";
import { badgesPage } from "../features/badges/badges-page.js";
import { brewPage } from "../features/brews/brew-detail-page.js";
import { coffeePage } from "../features/coffees/coffee-detail-page.js";
import { coffeesPage } from "../features/coffees/coffee-list-page.js";
import { journalPage } from "../features/journal/journal-page.js";
import { TABS, route, setCurrentRoute } from "./router.js";

export const view = $("#view");

export const fab = $("#fab");

export function render(isNav) {
  if (!state.ready) {
    return;
  }
  const r = route(), top = view.scrollTop;
  const tabOf = r.v === "coffee" ? "coffees" : r.v === "brew" ? (state.brews[r.id] ? "coffees" : "journal") : r.v;
  $("#tabs").innerHTML = TABS.map(([id, label, iconName]) => `<button class="tab" type="button" data-act="tab" data-id="${id}" ${tabOf === id ? 'aria-current="page"' : ""}><span class="pill">${icon(iconName)}</span>${label}</button>`).join("");
  let html = "", f = null;
  if (r.v === "coffees") {
    html = coffeesPage();
    f = ["Add coffee", "add-coffee"];
  } else if (r.v === "journal") {
    html = journalPage();
    if (coffees().length && !state.demo) {
      f = ["Log preparation", "pick-coffee"];
    }
  } else if (r.v === "badges") {
    html = badgesPage();
  } else if (r.v === "data") {
    html = dataPage();
  } else if (r.v === "coffee") {
    const c = state.coffees[r.id];
    if (!c) {
      setCurrentRoute("coffees");
      return render(true);
    }
    html = coffeePage(c);
    if (!c.demo) {
      f = ["Add preparation", "add-brew", c.id];
    }
  } else if (r.v === "brew") {
    const b = state.brews[r.id];
    if (!b) {
      setCurrentRoute("journal");
      return render(true);
    }
    html = brewPage(b);
  }
  view.innerHTML = html;
  view.dataset.page = r.v;
  if (f) {
    fab.hidden = false;
    fab.innerHTML = icon("plus") + esc(f[0]);
    fab.dataset.do = f[1];
    fab.dataset.id = f[2] || "";
  } else {
    fab.hidden = true;
  }
  if (isNav) {
    view.scrollTop = 0;
    view.classList.remove("enter");
    void view.offsetWidth;
    view.classList.add("enter");
  } else {
    view.scrollTop = top;
  }
}
