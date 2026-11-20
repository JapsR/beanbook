/**
 * Record ids: short, URL-safe strings.
 */
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const okId = v => typeof v === "string" && /^[a-z0-9]{6,24}$/.test(v);
