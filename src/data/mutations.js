/**
 * Deleting and duplicating records (and their photos) in state and storage.
 */
import { newId } from "../core/ids.js";
import { brewPhotoIds, normCoffee } from "../domain/records.js";
import { brewsOf, state } from "./state.js";
import { Store, addPhoto, delPhoto } from "./storage.js";

export function delBrew(id) {
  const b = state.brews[id];
  if (!b) {
    return;
  }
  brewPhotoIds(b).forEach(delPhoto);
  delete state.brews[id];
  Store.del("b_" + id);
}

export function delCoffee(id) {
  const c = state.coffees[id];
  if (!c) {
    return;
  }
  brewsOf(id).forEach(b => delBrew(b.id));
  delPhoto(c.photoId);
  delete state.coffees[id];
  Store.del("c_" + id);
}

/* A copy of a coffee without its preparations, as an open bag. The photo is copied, not shared,
   so deleting one coffee never removes the other's photo. Returns the new coffee. */
export function duplicateCoffee(id) {
  const c = state.coffees[id];
  if (!c) {
    return null;
  }
  const p = c.photoId && state.photos[c.photoId];
  const copy = normCoffee({ ...c, id: newId(), name: (c.name + " (copy)").slice(0, 80), finished: false, createdAt: Date.now(), photoId: p ? addPhoto(p) : null });
  state.coffees[copy.id] = copy;
  Store.put("c_" + copy.id, copy);
  return copy;
}

export function wipe() {
  Object.keys(state.coffees).forEach(id => state.demo ? 0 : delCoffee(id));
  Object.keys(state.photos).forEach(delPhoto);
  state.coffees = {};
  state.brews = {};
  state.demo = false;
}
