/**
 * The Data page: personal numbers, backup and privacy.
 */
import { esc } from "../../core/dom.js";
import { avg, fmtNum } from "../../core/format.js";
import { icon } from "../../ui/icons.js";
import { methodById } from "../../domain/brew-methods.js";
import { rated } from "../../domain/records.js";
import { brews, brewsOf, coffees, state } from "../../data/state.js";
import { Store } from "../../data/storage.js";

export function dataPage() {
  const bs = brews(), fav = {};
  bs.forEach(b => fav[b.method] = (fav[b.method] || 0) + 1);
  const favM = Object.entries(fav).sort((a, b) => b[1] - a[1])[0];
  const top = coffees().map(c => ({ c, a: avg(rated(brewsOf(c.id))) })).filter(x => x.a != null).sort((a, b) => b.a - a.a)[0];
  const grams = bs.reduce((s, b) => s + (b.dose || 0), 0);
  const st = { cloud: ["", "Saved privately to your Claude account. Only you can read it, on any device where you open this page."],
    local: ["", "Saved on this device only. Nothing is uploaded. Export a backup now and then, and to move to another phone."], memory: ["warn", "This browser blocks storage, so nothing is kept after you close the page. Export before leaving."] }[Store.mode];
  return `<header class="hero"><h1>Data</h1></header>
  <div class="list panels">
  <div class="panel"><h3>Your numbers</h3><div>
    <div class="kv"><span>Favourite method</span><b>${favM ? esc(methodById(favM[0]).name) + " (" + favM[1] + "×)" : "–"}</b></div>
    <div class="kv"><span>Best coffee so far</span><b>${top ? esc(top.c.name) + " · " + fmtNum(top.a, 2) : "–"}</b></div>
    <div class="kv"><span>Coffee brewed</span><b class="num">${grams ? fmtNum(grams, 0) + " g" : "–"}</b></div>
    <div class="kv"><span>Photos</span><b class="num">${Object.keys(state.photos).length}</b></div></div></div>
  <div class="panel"><h3>Move or back up</h3><p>Export writes everything to one file: coffees, preparations, photos and badges. Import that file on another device to carry on there.</p>
    <div class="row-btns"><button class="btn primary" type="button" data-act="export">${icon("down", 20)}Export</button>
    <label class="btn file-btn">${icon("up", 20)}Import<input id="import-file" type="file" accept=".json,application/json" aria-label="Import a Beanbook export file"></label></div>
    <div class="status"><span class="dot ${st[0]}"></span><span>${st[1]}</span></div></div>
  <div class="panel"><h3>Privacy</h3><p>Nothing here is shared with other people or used for statistics. There are no accounts to follow and no public feed.</p></div>
  <button class="btn ghost danger block" type="button" data-act="ask-wipe">${icon("trash", 20)}Delete all my data</button></div>`;
}
