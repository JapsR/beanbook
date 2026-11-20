/**
 * Medal artwork for a badge.
 */
import { ICON_PATHS } from "../../ui/icons.js";

const ROSETTE = (() => {
  const n = 12, r = 26.5;
  let d = "";
  const p = (a, R) => (32 + R * Math.cos(a)).toFixed(1) + " " + (32 + R * Math.sin(a)).toFixed(1);
  for (let i = 0; i < n; i++) {
    const a = i / n * 2 * Math.PI;
    if (!i) {
      d = "M" + p(a, r);
    }
    d += "Q" + p(a + Math.PI / n, 34) + " " + p(a + 2 * Math.PI / n, r);
  }
  return d + "Z";
})();

export const medal = (b, lvl, size = 60) => `<svg class="medal ${lvl ? "on" : ""}" style="--c:${b.color}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path class="m-bg" d="${ROSETTE}"/><circle class="m-ring" cx="32" cy="32" r="20.5"/><g class="m-ic" transform="translate(20 20)">${ICON_PATHS[b.icon]}</g></svg>`;
export const pipsLv = (b, lvl) => b.goals.length > 1 ? `<span class="lv">${b.goals.map((_, i) => `<i class="${i < lvl ? "on" : ""}"></i>`).join("")}</span>` : `<span class="lv"></span>`;
