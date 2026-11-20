/**
 * The page for one coffee: facts, best method and its preparations.
 */
import { fmtDate } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { avg, fmtNum, hue } from "../../core/format.js";
import { mtag } from "../../ui/components.js";
import { icon } from "../../ui/icons.js";
import { methodById } from "../../domain/brew-methods.js";
import { moreOn, rated } from "../../domain/records.js";
import { brewsOf, state } from "../../data/state.js";
import { brewRow } from "../brews/brew-row.js";

export function coffeePage(c) {
  const bs = brewsOf(c.id), rs = rated(bs), p = c.photoId && state.photos[c.photoId];
  const by = {};
  bs.forEach(b => (by[b.method] = by[b.method] || []).push(b));
  const cmp = Object.entries(by).map(([id, l]) => ({ m: methodById(id), n: l.length, a: avg(rated(l)) })).sort((x, y) => (y.a || 0) - (x.a || 0));
  const fact = (k, v) => `<div><span>${k}</span><b>${esc(v)}</b></div>`;
  const age = c.roastDate ? Math.round((Date.now() - Date.parse(c.roastDate)) / 864e5) : null;
  return `<div class="bar"><button class="ib" type="button" data-act="open" data-id="coffees" aria-label="Back to coffees">${icon("back")}</button><h2></h2>
    ${c.demo ? "" : `<button class="ib" type="button" data-act="edit-coffee" data-id="${c.id}" aria-label="Edit coffee">${icon("edit")}</button>`}</div>
  <div class="cover ${p ? "photo" : ""}" style="--h:${hue(c.name + c.origin)}">${p ? `<img src="${p}" alt="Photo of ${esc(c.name)}">` : ""}<div><h1>${esc(c.name)}</h1><span>${esc([c.roaster, c.origin].filter(Boolean).join(" · "))}</span></div></div>
  ${c.demo ? `<div class="banner" style="margin-top:12px"><p>This is an example. Add your own coffee to start tracking.</p></div>` : ""}
  <div class="facts">${fact("Form", c.form === "ground" ? "Ground" : "Whole beans")}${fact("Roast", c.roast ? c.roast[0].toUpperCase() + c.roast.slice(1) : "–")}${fact("Process", c.process || "–")}
    ${fact("Roasted", c.roastDate ? fmtDate(c.roastDate) + (age != null && age >= 0 && !c.finished ? ` (${age} d)` : "") : "–")}${fact("Bag", c.weight ? fmtNum(c.weight, 0) + " g" : "–")}${fact("Price", c.price != null ? "€ " + c.price.toFixed(2) : "–")}</div>
  ${moreOn(c) ? `<div class="cmp" style="margin-top:12px">${[["Region", c.region], ["Producer", c.producer], ["Variety", c.variety], ["Altitude", c.altitude ? fmtNum(c.altitude, 0) + " m" : ""], ["Roasted for", { filter: "Filter", espresso: "Espresso", omni: "Filter and espresso" }[c.roastFor] || ""], ["Roaster's notes", c.roasterNotes]].filter(x => x[1]).map(([k, v]) => `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`).join("")}</div>` : ""}
  ${c.notes ? `<div class="note">${esc(c.notes)}</div>` : ""}
  ${cmp.length > 1 || rs.length > 1 ? `<div class="section"><h3>Best method</h3><span>average rating</span></div><div class="cmp">${cmp.map(x => `<div class="cmp-row" style="--mc:${x.m.c}"><span>${mtag(x.m.id)}</span><span class="track"><i style="width:${(x.a || 0) / 5 * 100}%"></i></span><span class="v num"><b>${fmtNum(x.a, 2)}</b> · ${x.n}×</span></div>`).join("")}</div>` : ""}
  <div class="section"><h3>Preparations</h3><span>${bs.length ? bs.length + " logged" : ""}</span></div>
  <div class="list preps">${bs.length ? bs.map(b => brewRow(b, false)).join("") : `<div class="empty"><h3>Not brewed yet</h3><p>Log each way you prepare this coffee. Each preparation gets its own rating.</p>${c.demo ? "" : `<button class="btn primary" type="button" data-act="add-brew" data-id="${c.id}">${icon("plus")}Add preparation</button>`}</div>`}</div>
  ${c.demo ? "" : `<div class="row-btns" style="margin-top:22px"><button class="btn" type="button" data-act="toggle-finished" data-id="${c.id}">${icon("check", 20)}${c.finished ? "Reopen bag" : "Mark bag finished"}</button><button class="btn danger" type="button" data-act="ask-del-coffee" data-id="${c.id}">${icon("trash", 20)}Delete</button></div>`}`;
}
