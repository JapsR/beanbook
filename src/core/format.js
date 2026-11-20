/**
 * Number formatting and small maths helpers.
 */
export const fmtNum = (x, d = 1) => x == null ? "–" : (Math.round(x * 10 ** d) / 10 ** d).toString();

export const fmtRate = x => x == null ? "–" : x.toFixed(2).replace(/0$/, "");
export const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

export const hue = s => {
  let h = 0;
  for (const ch of String(s)) {
    h = (h * 31 + ch.charCodeAt(0)) % 360;
  }
  return h;
};
