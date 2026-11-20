/**
 * The page for one preparation.
 */
import { fmtDay } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { fmtNum, fmtRate } from "../../core/format.js";
import { pips } from "../../ui/components.js";
import { icon } from "../../ui/icons.js";
import { ADV, methodById } from "../../domain/brew-methods.js";
import { ratio } from "../../domain/records.js";
import { state } from "../../data/state.js";

export function brewPage(b) {
  const c = state.coffees[b.coffeeId], m = methodById(b.method), p = b.photoId && state.photos[b.photoId];
  const fact = (k, v) => `<div><span>${k}</span><b class="num">${esc(v)}</b></div>`;
  return `<div class="bar"><button class="ib" type="button" data-act="open" data-id="${c ? "coffee-" + c.id : "journal"}" aria-label="Back">${icon("back")}</button><h2>${esc(c ? c.name : "Preparation")}</h2>
    ${b.demo ? "" : `<button class="ib" type="button" data-act="edit-brew" data-id="${b.id}" aria-label="Edit preparation">${icon("edit")}</button>`}</div>
  <div class="card" style="margin-top:4px"><span class="mtile" style="--mc:${m.c}">${esc(m.ab)}</span><span class="body"><span class="t">${esc(m.name)}</span><span class="m">${esc(fmtDay(b.date))} at ${b.date.slice(11, 16)}</span></span></div>
  <div class="big-score"><b class="num">${fmtRate(b.rating)}</b><div>${pips(b.rating)}<div class="sub" style="font-size:13px;margin-top:8px">${b.rating == null ? "Not rated yet" : "out of 5"}</div></div></div>
  <div class="facts">${fact("Coffee", b.dose ? fmtNum(b.dose) + " g" : "–")}${fact(m.out || "Water", b.water ? fmtNum(b.water, 0) + " g" : "–")}${fact("Ratio", ratio(b) || "–")}${fact("Temp", b.temp ? fmtNum(b.temp, 0) + " °C" : "–")}${fact("Time", b.time || "–")}${fact("Grind", b.grind || "–")}</div>
  ${Object.keys(b.extra).length ? `<div class="section"><h3>Advanced</h3></div><div class="cmp">${(ADV[m.id] || []).filter(d => b.extra[d.k] != null).map(d => `<div class="kv"><span>${d.l}</span><b class="num">${esc(b.extra[d.k])}</b></div>`).join("")}</div>` : ""}
  ${b.stages.length && m.pour ? `<div class="section"><h3>Pouring stages</h3><span>${b.stages.length} pours</span></div><div class="cmp">${b.stages.map(x => `<div class="kv"><span class="num">${esc(x.t || "–")}</span><b class="num">${esc([x.g != null ? "to " + fmtNum(x.g, 0) + " g" : "", x.note].filter(Boolean).join(" · ") || "–")}</b></div>`).join("")}</div>` : ""}
  ${b.flavors.length ? `<div class="section"><h3>Tasting notes</h3></div><div class="tags">${b.flavors.map(f => `<span class="tag" style="font-size:13px;padding:6px 11px;border-radius:10px;background:var(--surface)">${esc(f)}</span>`).join("")}</div>` : ""}
  ${b.notes ? `<div class="note">${esc(b.notes)}</div>` : ""}
  ${p ? `<div class="photo-full"><img src="${p}" alt="Photo of this preparation"></div>` : ""}
  ${b.demo || !c ? "" : `<div class="row-btns" style="margin-top:22px"><button class="btn" type="button" data-act="again" data-id="${b.id}">${icon("swap", 20)}Brew again</button><button class="btn danger" type="button" data-act="ask-del-brew" data-id="${b.id}">${icon("trash", 20)}Delete</button></div>`}`;
}
