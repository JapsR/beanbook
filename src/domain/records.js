/**
 * Normalisers for coffees and preparations: every record passes through these before it is stored or shown.
 */
import { localStamp } from "../core/dates.js";
import { fmtNum } from "../core/format.js";
import { newId, okId } from "../core/ids.js";
import { num, str } from "../core/validate.js";
import { normExtra, normStages } from "./brew-methods.js";
import { keepExtra } from "./schema.js";
import { ROASTV } from "./vocabulary.js";

/* Longest coffee or preparation note, in characters (about 3,000 words). Notes are Markdown. */
export const NOTES_MAX = 20000;

/* Most photos on one preparation. The first is stored as photoId (what older versions show), the rest as morePhotoIds. */
export const PHOTOS_MAX = 8;

export function normCoffee(o) {
  o = o || {};
  return keepExtra(o, {
    k: "coffee", id: okId(o.id) ? o.id : newId(), name: str(o.name, 80), roaster: str(o.roaster, 60), origin: str(o.origin, 60),
    process: str(o.process, 40), roast: ROASTV.includes(o.roast) ? o.roast : "",
    form: o.form === "ground" ? "ground" : "beans", roastDate: /^\d{4}-\d\d-\d\d$/.test(o.roastDate || "") ? o.roastDate : "", bought: /^\d{4}-\d\d-\d\d$/.test(o.bought || "") ? o.bought : "",
    weight: num(o.weight, 1, 100000), price: num(o.price, 0, 100000), notes: str(o.notes, NOTES_MAX), photoId: okId(o.photoId) ? o.photoId : null,
    region: str(o.region, 60), producer: str(o.producer, 60), variety: str(o.variety, 60), altitude: num(o.altitude, 0, 5000),
    roastFor: ["filter", "espresso", "omni"].includes(o.roastFor) ? o.roastFor : "", roasterNotes: str(o.roasterNotes, 120), finished: !!o.finished, createdAt: Number(o.createdAt) || Date.now()
  });
}

export function normBrew(o) {
  o = o || {};
  const r = num(o.rating, 0.25, 5);
  return keepExtra(o, {
    k: "brew", id: okId(o.id) ? o.id : newId(), coffeeId: String(o.coffeeId || ""), method: typeof o.method === "string" && /^[a-z0-9]{2,30}$/.test(o.method) ? o.method : "other",
    date: /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(o.date || "") ? o.date.slice(0, 16) : localStamp(), dose: num(o.dose, 0.1, 5000), water: num(o.water, 1, 50000),
    temp: num(o.temp, 0, 100), time: str(o.time, 12), grind: str(o.grind, 40), rating: r == null ? null : Math.round(r * 4) / 4,
    flavors: Array.isArray(o.flavors) ? o.flavors.filter(f => typeof f === "string" && f.length > 0 && f.length <= 30).slice(0, 16) : [], stages: normStages(o.stages), extra: normExtra(o.method, o.extra), notes: str(o.notes, NOTES_MAX), photoId: okId(o.photoId) ? o.photoId : null,
    morePhotoIds: Array.isArray(o.morePhotoIds) ? [...new Set(o.morePhotoIds.filter(id => okId(id) && id !== o.photoId))].slice(0, PHOTOS_MAX - 1) : []
  });
}

/* All photo ids of a preparation, first one first. */
export const brewPhotoIds = b => [b.photoId, ...(b.morePhotoIds || [])].filter(Boolean);

export const okPhoto = d => typeof d === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d) && d.length < 240000;
export const moreOn = c => !!(c.region || c.producer || c.variety || c.altitude || c.roastFor || c.roasterNotes);
export const rated = l => l.filter(b => b.rating != null).map(b => b.rating);
export const ratio = b => b.dose && b.water ? "1:" + fmtNum(b.water / b.dose, 1) : null;
