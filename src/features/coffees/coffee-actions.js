/**
 * Button handlers for coffees: add, edit, finish, delete, clear examples.
 */
import { closeSheet, confirmSheet } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { dropDemo } from "../../data/demo-data.js";
import { delCoffee } from "../../data/mutations.js";
import { brewsOf, state } from "../../data/state.js";
import { Store, saveMeta } from "../../data/storage.js";
import { checkBadges } from "../badges/badge-progress.js";
import { coffeeForm } from "./coffee-form.js";
import { render } from "../../app/render.js";
import { go, route } from "../../app/router.js";

export const coffeeActions = {
  "add-coffee": () => coffeeForm(), "edit-coffee": id => coffeeForm(state.coffees[id]),
  "clear-demo": () => {
    dropDemo();
    state.meta.demoOff = true;
    saveMeta();
    render();
  },
  "toggle-finished": id => {
    const c = state.coffees[id];
    if (!c) {
      return;
    }
    c.finished = !c.finished;
    Store.put("c_" + id, c);
    render();
    toast(c.finished ? "Bag marked finished" : "Bag reopened");
    checkBadges();
  },
  "ask-del-coffee": id => {
    const n = brewsOf(id).length;
    confirmSheet("Delete this coffee?", n ? `Its ${n} preparation${n === 1 ? "" : "s"} and photos are deleted too. This cannot be undone.` : "This cannot be undone.", "Delete", "del-coffee", id);
  },
  "del-coffee": id => {
    const r = route();
    delCoffee(id);
    closeSheet();
    r.v === "coffee" && r.id === id ? go("coffees") : render();  // from a list's menu: stay on that list
    toast("Coffee deleted");
  }
};
