/**
 * Deleting records (and their photos) from state and storage.
 */
import { brewsOf, state } from "./state.js";
import { Store, delPhoto } from "./storage.js";

export function delBrew(id) {
  const b = state.brews[id];
  if (!b) {
    return;
  }
  delPhoto(b.photoId);
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

export function wipe() {
  Object.keys(state.coffees).forEach(id => state.demo ? 0 : delCoffee(id));
  Object.keys(state.photos).forEach(delPhoto);
  state.coffees = {};
  state.brews = {};
  state.demo = false;
}
