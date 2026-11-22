/**
 * Button handlers for preparations: add, edit, brew again, delete, custom methods and tasting notes, pouring stages and the brew timer.
 */
import { $, esc } from "../../core/dom.js";
import { num } from "../../core/validate.js";
import { thumb } from "../../ui/components.js";
import { closeSheet, confirmSheet, openSheet, sheetHeader } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { delBrew } from "../../data/mutations.js";
import { coffees, state } from "../../data/state.js";
import { stageRow } from "./brew-advanced-fields.js";
import { addFlavor, addMethod, brewForm } from "./brew-form.js";
import { clearTimer, markPour, toggleTimer } from "./brew-timer.js";
import { go } from "../../app/router.js";

export const brewActions = {
  "add-brew": id => brewForm(id), "edit-brew": id => {
    const b = state.brews[id];
    b && brewForm(b.coffeeId, b);
  }, again: id => {
    const b = state.brews[id];
    b && brewForm(b.coffeeId, b, true);
  },
  "pick-coffee": () => {
    const l = coffees().sort((a, b) => (a.finished - b.finished) || (b.createdAt - a.createdAt));
    openSheet(`${sheetHeader("Which coffee?")}<div class="sheet-body"><div class="list">${l.map(c => `<button class="card" type="button" data-act="add-brew" data-id="${c.id}">${thumb(c)}<span class="body"><span class="t">${esc(c.name)}</span><span class="m">${esc([c.roaster, c.finished ? "Finished" : ""].filter(Boolean).join(" · "))}</span></span></button>`).join("")}</div></div>`);
  },
  "ask-del-brew": id => confirmSheet("Delete this preparation?", "This cannot be undone.", "Delete", "del-brew", id),
  "del-brew": id => {
    const b = state.brews[id];
    const back = b && state.coffees[b.coffeeId] ? "coffee-" + b.coffeeId : "journal";
    delBrew(id);
    closeSheet();
    go(back);
    toast("Preparation deleted");
  },
  "new-method": () => {
    const r = $("#new-method-row");
    r.hidden = !r.hidden;
    if (!r.hidden) {
      $("#new-method-name").focus();
    }
  },
  "add-method": () => addMethod(),
  "new-flavor": () => {
    const r = $("#new-flavor-row");
    r.hidden = !r.hidden;
    if (!r.hidden) {
      $("#new-flavor-name").focus();
    }
  },
  "add-flavor": () => addFlavor(),
  "timer-toggle": () => toggleTimer(), "timer-reset": () => clearTimer(), "timer-pour": () => markPour(),
  "stage-add": () => {
    $("#stage-list").insertAdjacentHTML("beforeend", stageRow());
    const l = $("#stage-list").lastElementChild;
    l && l.querySelector("input").focus();
  },
  "stage-del": (id, el) => el.closest(".stage").remove(),
  "stage-preset": () => {
    const f = $("#brew-form"), d = num(f.dose.value, 0.1, 5000), w = num(f.water.value, 1, 50000);
    if (!w) {
      toast("Fill in the water amount first.");
      return;
    }
    const bloom = Math.round(Math.min(w * .25, d ? d * 3 : w * .15));
    $("#stage-list").innerHTML = [{ t: "0:00", g: bloom, note: "Bloom" }, { t: "0:45", g: Math.round(w * .6), note: "" }, { t: "1:30", g: Math.round(w), note: "" }].map(stageRow).join("");
  }
};
