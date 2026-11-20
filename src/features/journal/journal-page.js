/**
 * The Journal page: every preparation, newest first, grouped by day.
 */
import { dayOf, fmtDay } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { methodById } from "../../domain/brew-methods.js";
import { brews, coffees, ui } from "../../data/state.js";
import { brewRow } from "../brews/brew-row.js";

export function journalPage() {
  const used = [...new Set(brews().map(b => b.method))];
  const l = brews().filter(b => ui.jm === "all" || b.method === ui.jm).sort((a, b) => b.date.localeCompare(a.date));
  let out = "";
  let day = "";
  l.forEach(b => {
    const d = dayOf(b.date);
    if (d !== day) {
      day = d;
      out += `<div class="day">${esc(fmtDay(b.date))}</div>`;
    }
    out += `<div style="margin-bottom:10px">${brewRow(b, true)}</div>`;
  });
  return `<header class="hero"><h1>Journal</h1><p class="sub" style="margin:0">Every cup you have logged, newest first.</p></header>
  ${used.length > 1 ? `<div class="chips"><button class="chip" type="button" data-act="jm" data-id="all" aria-pressed="${ui.jm === "all"}">All methods</button>${used.map(id => `<button class="chip" type="button" data-act="jm" data-id="${id}" aria-pressed="${ui.jm === id}">${esc(methodById(id).name)}</button>`).join("")}</div>` : ""}
  ${l.length ? `<div class="jlist">${out}</div>` : `<div class="empty" style="margin-top:12px"><h3>No preparations yet</h3><p>${coffees().length ? "Open a coffee and add how you prepared it." : "Add a coffee first, then log how you prepared it."}</p></div>`}`;
}
