/**
 * Typed text fields: durations, decimals and whole numbers.
 *
 * They stay type="text" (so values like "18,5" and "2:30" keep working), but get the right phone
 * keyboard and are cleaned up while typing, so only characters that make sense can go in:
 *   duration  m:ss (or h:mm:ss). Type digits only; the colon is placed for you: 2 3 0 → 2:30.
 *             Typed or pasted separators also work: "2.30", "2,30", "2.5" (2½ min), "2m30", "2'30", "150s".
 *   decimal   digits and one decimal separator ("," or ".").
 *   integer   digits only.
 *
 * Use it in markup:  <input type="text" ${fieldType("duration")} …>
 * app/events.js calls typeField() on input and finishField() when a field loses focus.
 */
const FIELD_ATTRS = {
  duration: 'inputmode="numeric" data-field="duration" autocomplete="off"',
  decimal: 'inputmode="decimal" data-field="decimal" autocomplete="off"',
  integer: 'inputmode="numeric" data-field="integer" autocomplete="off"'
};

export const fieldType = kind => FIELD_ATTRS[kind] || "";

/* "230" → "2:30", "12345" → "1:23:45": digits fill from the right, like a microwave timer. */
function digitsToDuration(d) {
  d = d.replace(/^0+(?=\d)/, "").slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, -2) + ":" + d.slice(-2);
  return d.slice(0, -4) + ":" + d.slice(-4, -2) + ":" + d.slice(-2);
}

/* Reads anything a person might type for a duration into seconds, or null if it isn't one. */
export function parseDuration(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*(?:m|min|'))?\s*(?:(\d+)\s*(?:s|sec|"))?$/)) && (m[1] || m[2] || m[3])) {
    return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  }
  if ((m = s.match(/^(\d+)\s*(?:m|min|')\s*(\d{1,2})\s*(?:s|sec|")?$/))) return +m[1] * 60 + +m[2];  // "2m30", "2'30"
  if ((m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/))) {
    return m[3] != null ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
  }
  if ((m = s.match(/^(\d+)[.,](\d)$/))) return +m[1] * 60 + +m[2] * 6;          // "2.5" = 2½ minutes
  if ((m = s.match(/^(\d+)[.,](\d\d)$/))) return +m[1] * 60 + +m[2];            // "2.30" = 2:30
  if (/^\d+$/.test(s)) return +s;          // plain digits are seconds
  return null;
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  const pad = n => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/* While typing: drop characters that don't belong. */
export function typeField(el) {
  const kind = el.dataset.field, before = el.value;
  let v = before;
  if (kind === "integer") {
    v = v.replace(/\D/g, "");
  } else if (kind === "decimal") {
    v = v.replace(/[^\d.,]/g, "");
    const i = v.search(/[.,]/);
    if (i > -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, "");
  } else if (kind === "duration") {
    // a separator or unit means the person is typing a format themselves: leave it until they finish
    v = /[:.,'"hms]/i.test(v) ? v.replace(/[^\d:.,'"hmsinec ]/gi, "") : digitsToDuration(v.replace(/\D/g, ""));
  }
  if (v !== before) {
    el.value = v;
    el.setSelectionRange?.(v.length, v.length);
  }
}

/* On leaving the field: write durations in one tidy form ("90" → "1:30", "2.3" → "2:03"). */
export function finishField(el) {
  if (el.dataset.field !== "duration" || !el.value.trim()) return;
  const v = el.value.trim();
  const sec = parseDuration(/^\d{3,}$/.test(v) ? digitsToDuration(v) : v);
  if (sec != null) el.value = formatDuration(sec);
}
