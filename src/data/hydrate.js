/**
 * Turns stored documents into app state, upgrading old records on the way.
 */
import { normMethod } from "../domain/brew-methods.js";
import { normBrew, normCoffee, okPhoto } from "../domain/records.js";
import { SCHEMA, keepExtra, upgrade } from "../domain/schema.js";
import { brews, coffees, state } from "./state.js";
import { Store, saveMeta } from "./storage.js";

export function hydrate(docs) {
  state.coffees = {};
  state.brews = {};
  state.photos = {};
  const mv = docs && docs.meta, from = Math.max(1, Number(mv && mv.schema) || 1);
  if (mv && typeof mv === "object") {
    state.meta = keepExtra(mv, {
      badges: (mv.badges && typeof mv.badges === "object") ? JSON.parse(JSON.stringify(mv.badges)) : {}, exports: Number(mv.exports) || 0, demoOff: !!mv.demoOff,
      methods: Array.isArray(mv.methods) ? mv.methods.map(normMethod).filter(m => m.name).slice(0, 40) : [], schema: Math.max(SCHEMA, from)
    });
  }
  for (const [key, v] of Object.entries(docs || {})) {
    if (!v || typeof v !== "object" || key === "meta") {
      continue;
    }
    if (key.startsWith("c_")) {
      const c = normCoffee({ ...upgrade("coffee", v, from), id: key.slice(2) });
      state.coffees[c.id] = c;
    } else if (key.startsWith("b_")) {
      const b = normBrew({ ...upgrade("brew", v, from), id: key.slice(2) });
      state.brews[b.id] = b;
    } else if (key.startsWith("p_") && okPhoto(v.d)) {
      state.photos[key.slice(2)] = v.d;
    }
  }
  if (mv && from < SCHEMA) {
    coffees().forEach(c => Store.put("c_" + c.id, c));
    brews().forEach(b => Store.put("b_" + b.id, b));
    saveMeta();
  } /* stored data was upgraded: write it back once */
}
