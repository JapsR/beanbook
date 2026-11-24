/**
 * In-memory app state and simple selectors over it.
 */
import { SCHEMA } from "../domain/schema.js";

export const state = {
  coffees: {}, brews: {}, photos: {}, meta: {
    badges: {}, exports: 0, demoOff: false, methods: [], schema: SCHEMA
  }, demo: false, ready: false
};

export const ui = { q: "", filter: "all", jm: "all", notesOpen: {} };   // notesOpen: coffee ids whose notes are unfolded
export const coffees = () => Object.values(state.coffees);
export const brews = () => Object.values(state.brews);
export const brewsOf = id => brews().filter(b => b.coffeeId === id).sort((a, b) => b.date.localeCompare(a.date));
