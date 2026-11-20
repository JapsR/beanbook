/**
 * One preparation as a list row (used by the journal and the coffee page).
 */
import { fmtDay } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { fmtRate } from "../../core/format.js";
import { pips, recipe } from "../../ui/components.js";
import { methodById } from "../../domain/brew-methods.js";
import { state } from "../../data/state.js";

export function brewRow(b, withCoffee) {
  const m = methodById(b.method), c = state.coffees[b.coffeeId];
  return `<button class="card" type="button" data-act="open" data-id="brew-${b.id}"><span class="mtile" style="--mc:${m.c}">${esc(m.ab)}</span>
  <span class="body"><span class="t">${esc(withCoffee ? (c ? c.name : "Deleted coffee") : m.name)}</span><span class="m num">${esc((withCoffee ? m.name + (recipe(b) ? " · " : "") : "") + recipe(b) || (withCoffee ? "" : "No recipe details"))}</span>
  ${b.flavors.length ? `<span class="tags">${b.flavors.slice(0, 3).map(f => `<span class="tag">${esc(f)}</span>`).join("")}${b.flavors.length > 3 ? `<span class="tag">+${b.flavors.length - 3}</span>` : ""}</span>` : ""}</span>
  <span class="score"><b class="num">${fmtRate(b.rating)}</b>${pips(b.rating)}<small>${withCoffee ? b.date.slice(11, 16) : esc(fmtDay(b.date))}</small></span></button>`;
}
