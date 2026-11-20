/**
 * Date helpers. Dates are stored as local "YYYY-MM-DDTHH:MM" strings.
 */
const pad = n => String(n).padStart(2, "0");

export const localStamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const dayOf = s => String(s || "").slice(0, 10);

export const fmtDay = s => {
  const d = new Date(dayOf(s) + "T12:00");
  if (isNaN(d)) {
    return "";
  }
  const t = dayOf(localStamp());
  const y = dayOf(localStamp(new Date(Date.now() - 864e5)));
  if (dayOf(s) === t) {
    return "Today";
  }
  if (dayOf(s) === y) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

export const fmtDate = s => {
  if (!s) {
    return "–";
  }
  const d = new Date(dayOf(s) + "T12:00");
  return isNaN(d) ? "–" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
