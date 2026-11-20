/**
 * The Coffees page: stats strip, search, filters and the coffee list.
 */
import { esc } from "../../core/dom.js";
import { avg, fmtNum, fmtRate } from "../../core/format.js";
import { mtag, pips, thumb } from "../../ui/components.js";
import { icon } from "../../ui/icons.js";
import { rated } from "../../domain/records.js";
import { brews, brewsOf, coffees, state, ui } from "../../data/state.js";

function coffeeCard(c) {
  const bs = brewsOf(c.id), rs = rated(bs), best = rs.length ? Math.max(...rs) : null, ms = [...new Set(bs.map(b => b.method))];
  return `<button class="card" type="button" data-act="open" data-id="coffee-${c.id}">${thumb(c)}
  <span class="body"><span class="t">${esc(c.name)}</span><span class="m">${esc([c.roaster, c.origin].filter(Boolean).join(" · ") || "No roaster or origin yet")}</span>
  <span class="tags">${c.demo ? '<span class="tag demo">Example</span>' : ""}<span class="tag">${c.form === "ground" ? "Ground" : "Beans"}</span>${c.finished ? '<span class="tag">Finished</span>' : ""}${ms.slice(0, 2).map(mtag).join("")}${ms.length > 2 ? `<span class="tag">+${ms.length - 2}</span>` : ""}</span></span>
  <span class="score"><b class="num">${fmtRate(best)}</b>${pips(best)}<small>${bs.length ? bs.length + (bs.length === 1 ? " prep" : " preps") : "not brewed"}</small></span></button>`;
}

export function coffeeList() {
  const q = ui.q.toLowerCase();
  let l = coffees().filter(c => (!q || [c.name, c.roaster, c.origin, c.process].join(" ").toLowerCase().includes(q)) &&
    (ui.filter === "all" || (ui.filter === "open" && !c.finished) || (ui.filter === "finished" && c.finished) || ui.filter === c.form));
  if (ui.filter === "top") {
    l = l.filter(c => rated(brewsOf(c.id)).length).sort((a, b) => Math.max(...rated(brewsOf(b.id))) - Math.max(...rated(brewsOf(a.id))));
  } else {
    l.sort((a, b) => (a.finished - b.finished) || (b.createdAt - a.createdAt));
  }
  if (!l.length) {
    return coffees().length ? `<div class="empty"><h3>Nothing matches</h3><p>Try another search or filter.</p></div>`
      : `<div class="empty"><h3>Your shelf is empty</h3><p>Add the bag you are drinking now. Then log each way you prepare it and rate the cup.</p><button class="btn primary" type="button" data-act="add-coffee">${icon("plus")}Add your first coffee</button></div>`;
  }
  return l.map(coffeeCard).join("");
}

export function coffeesPage() {
  const bs = brews(), a = avg(rated(bs));
  const chip = (id, label) => `<button class="chip" type="button" data-act="filter" data-id="${id}" aria-pressed="${ui.filter === id}">${label}</button>`;
  return `<header class="hero"><h1>Bean<em>book</em></h1>
  <div class="strip"><div><b class="num">${coffees().length}</b><span>coffees</span></div><div><b class="num">${bs.length}</b><span>preparations</span></div><div><b class="num">${fmtNum(a, 2)}</b><span>average rating</span></div></div></header>
  <div class="list">
  ${state.demo ? `<div class="banner"><p><b>These are example coffees.</b> They disappear when you add your own.</p><button class="btn small ghost" type="button" data-act="clear-demo">Clear</button></div>` : ""}
  <label class="search">${icon("search", 20)}<input id="q" type="search" placeholder="Search name, roaster, origin" value="${esc(ui.q)}" autocomplete="off" aria-label="Search coffees"></label>
  <div class="chips">${chip("all", "All")}${chip("open", "Open bags")}${chip("top", "Top rated")}${chip("beans", "Beans")}${chip("ground", "Ground")}${chip("finished", "Finished")}</div>
  <div class="list" id="coffee-list">${coffeeList()}</div></div>`;
}
