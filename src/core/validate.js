/**
 * Input sanitisers used for forms, stored data and import files.
 */
export const str = (v, n = 120) => typeof v === "string" ? v.trim().slice(0, n) : "";

export const num = (v, min, max) => {
  if (v === "" || v == null) {
    return null;
  }
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) && x >= min && x <= max ? x : null;
};

export const okDate = x => /^\d{4}-\d\d-\d\d/.test(x || "") ? x.slice(0, 10) : "";
