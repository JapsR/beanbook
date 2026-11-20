/**
 * Button handler for opening a badge's detail sheet.
 */
import { fmtDate } from "../../core/dates.js";
import { esc } from "../../core/dom.js";
import { openSheet } from "../../ui/sheet.js";
import { state } from "../../data/state.js";
import { BADGES } from "./badge-definitions.js";
import { facts } from "./badge-progress.js";
import { medal } from "./medal.js";

export const badgeActions = {
  badge: id => {
    const b = BADGES.find(x => x.id === id), f = facts(), have = state.meta.badges[id] || {}, lvl = have.level || 0, val = f ? f[b.key] || 0 : 0, next = b.goals[lvl];
    openSheet(`<div class="won">${medal(b, lvl, 104)}<small>${lvl ? (b.goals.length > 1 ? "Level " + lvl + " of " + b.goals.length : "Earned") : "Locked"}</small><h2>${esc(b.name)}</h2><p>${esc(b.what)}</p>
    ${next ? `<div style="width:100%"><div class="progress"><i style="width:${Math.min(100, val / next * 100)}%"></i></div><p class="num" style="margin-top:8px;font-size:13.5px">${val} of ${next} ${esc(b.unit || "")}${lvl ? " for the next level" : ""}</p></div>` : ""}
    ${have.at ? `<p style="font-size:13.5px">Earned ${esc(fmtDate(have.at))}</p>` : ""}</div><div class="sheet-foot"><button class="btn" type="button" data-act="close-sheet">Close</button></div>`, { pop: true });
  }
};
