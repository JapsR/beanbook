/**
 * Small reusable HTML snippets: rating pips, method tag, coffee thumbnail, recipe line, segmented control.
 */
import { esc } from "../core/dom.js";
import { fmtNum, fmtRate, hue } from "../core/format.js";
import { methodById } from "../domain/brew-methods.js";
import { state } from "../data/state.js";

export const pips = r => `<span class="pips" role="img" aria-label="${r == null ? "Not rated" : fmtRate(r) + " out of 5"}"><i style="width:${(r || 0) * 12}px"></i></span>`;

export const mtag = id => {
  const m = methodById(id);
  return `<span class="tag m" style="--mc:${m.c}">${esc(m.name)}</span>`;
};

export const thumb = (c) => {
  const p = c.photoId && state.photos[c.photoId];
  return `<span class="thumb" style="--h:${hue(c.name + c.origin)}">${p ? `<img src="${p}" alt="">` : esc((c.name || "?").trim().charAt(0).toUpperCase())}</span>`;
};

export const recipe = b => [b.dose ? fmtNum(b.dose) + " g" : null, b.water ? fmtNum(b.water, 0) + " g " + (methodById(b.method).out ? "out" : "water") : null, b.temp ? fmtNum(b.temp, 0) + " °C" : null, b.time || null].filter(Boolean).join(" · ");
export const seg = (name, opts, val) => `<div class="seg">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" id="${name}-${v || "none"}" value="${v}" ${val === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
