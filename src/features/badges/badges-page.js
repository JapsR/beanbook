/**
 * The Badges page.
 */
import { esc } from "../../core/dom.js";
import { state } from "../../data/state.js";
import { BADGES } from "./badge-definitions.js";
import { facts } from "./badge-progress.js";
import { medal, pipsLv } from "./medal.js";

export function badgesPage() {
  const f = facts();
  const got = BADGES.filter(b => (state.meta.badges[b.id] || {}).level).length;
  return `<header class="hero"><h1>Badges</h1><p class="sub" style="margin:0"><b style="color:var(--ink)" class="num">${got} of ${BADGES.length}</b> earned${state.demo ? ". Add your own coffee to start earning." : ""}</p>
  <div class="progress" role="img" aria-label="${got} of ${BADGES.length} badges earned"><i style="width:${got / BADGES.length * 100}%"></i></div></header>
  <div class="bgrid">${BADGES.map(b => {
    const lvl = (state.meta.badges[b.id] || {}).level || 0;
    return `<button class="badge ${lvl ? "" : "off"}" type="button" data-act="badge" data-id="${b.id}">${medal(b, lvl)}<b>${esc(b.name)}</b>${pipsLv(b, lvl)}</button>`;
  }).join("")}</div>`;
}
