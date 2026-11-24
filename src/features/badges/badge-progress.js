/**
 * Computes the numbers badges count and keeps earned badge levels in line with the data.
 *
 * checkBadges runs after every change (add, edit, delete, import, bag finished). Levels go up when a
 * goal is reached and back down, or away, when an edit or delete means the goal is no longer met.
 */
import { dayOf, localStamp } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { openSheet } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { brews, coffees, state } from "../../data/state.js";
import { saveMeta } from "../../data/storage.js";
import { BADGES } from "./badge-definitions.js";
import { medal } from "./medal.js";

export function facts() {
  if (state.demo) {
    return null;
  }
  const cs = coffees(), bs = brews();
  const set = f => new Set(f.filter(Boolean).map(x => x.toLowerCase())).size;
  const perC = {}, mPerC = {};
  bs.forEach(b => {
    perC[b.coffeeId] = (perC[b.coffeeId] || 0) + 1;
    (mPerC[b.coffeeId] = mPerC[b.coffeeId] || new Set()).add(b.method);
  });
  const days = [...new Set(bs.map(b => dayOf(b.date)))].sort();
  let streak = 0, run = 0, prev = null;
  days.forEach(d => {
    const t = Date.parse(d + "T12:00");
    run = prev != null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    prev = t;
    streak = Math.max(streak, run);
  });
  const dset = new Set(days);
  let weekends = 0;
  days.forEach(d => {
    const x = new Date(d + "T12:00");
    if (x.getDay() === 6 && dset.has(dayOf(localStamp(new Date(x.getTime() + 864e5))))) {
      weekends++;
    }
  });
  const hr = b => Number(b.date.slice(11, 13));
  return {
    coffees: cs.length, brews: bs.length, methods: new Set(bs.map(b => b.method)).size, origins: set(cs.map(c => c.origin)), roasters: set(cs.map(c => c.roaster)),
    maxPer: Math.max(0, ...Object.values(perC)), maxM: Math.max(0, ...Object.values(mPerC).map(s => s.size)),
    five: bs.filter(b => b.rating === 5).length, high: bs.filter(b => b.rating >= 4.5).length, low: bs.filter(b => b.rating != null && b.rating <= 2).length,
    flavors: new Set(bs.flatMap(b => b.flavors)).size, notes: bs.filter(b => b.notes.length >= 10).length,
    photos: cs.filter(c => c.photoId).length + bs.filter(b => b.photoId).length, early: bs.filter(b => hr(b) < 7).length, late: bs.filter(b => hr(b) >= 21).length,
    streak, weekends, fresh: bs.filter(b => {
      const c = state.coffees[b.coffeeId];
      if (!c || !c.roastDate) {
        return false;
      }
      const n = (Date.parse(dayOf(b.date)) - Date.parse(c.roastDate)) / 864e5;
      return n >= 0 && n <= 14;
    }).length,
    cold: bs.filter(b => b.method === "coldbrew").length, finished: cs.filter(c => c.finished).length, exports: state.meta.exports
  };
}

const levelFor = (b, f) => f ? b.goals.filter(g => (f[b.key] || 0) >= g).length : 0;

export function checkBadges(quiet) {
  const f = facts();
  if (!f) {
    return;
  }
  const won = [], lost = [];
  BADGES.forEach(b => {
    const lvl = levelFor(b, f), had = state.meta.badges[b.id], have = (had || {}).level || 0;
    if (lvl > have) {
      state.meta.badges[b.id] = { level: lvl, at: dayOf(localStamp()) };
      won.push({ b, lvl });
    } else if (lvl < have) {
      if (lvl) {
        state.meta.badges[b.id] = { ...had, level: lvl };
      } else {
        delete state.meta.badges[b.id];
      }
      lost.push({ b, lvl });
    }
  });
  if (!won.length && !lost.length) {
    return;
  }
  saveMeta();
  if (lost.length && state.ready) {
    const l = lost[0];
    toast(lost.length > 1 ? lost.length + " badges lost or lowered" : l.lvl ? `Badge lowered: ${l.b.name} · Level ${l.lvl}` : "Badge lost: " + l.b.name);
  }
  if (!won.length) {
    return;
  }
  if (quiet) {
    if (state.ready) {
      toast(won.length === 1 ? "Badge earned: " + won[0].b.name : won.length + " badges earned");
    }
    return;
  }
  const first = won[0];
  openSheet(`<div class="won">${medal(first.b, first.lvl, 112)}<small>Badge earned</small><h2>${esc(first.b.name)}${first.b.goals.length > 1 ? " · Level " + first.lvl : ""}</h2><p>${esc(first.b.what)}</p>
  ${won.length > 1 ? `<p>Also earned: ${won.slice(1).map(w => esc(w.b.name)).join(", ")}</p>` : ""}</div>
  <div class="sheet-foot"><button class="btn primary" type="button" data-act="close-sheet">Nice</button></div>`, { pop: true });
  try {
    navigator.vibrate && navigator.vibrate([20, 40, 30]);
  } catch (e) {
  }
}
