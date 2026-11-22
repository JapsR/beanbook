/**
 * One delegated listener per event type for the whole app (click, submit, input, change, keydown).
 */
import { $, isTypingField } from "../core/dom.js";
import { fmtRate } from "../core/format.js";
import { pips } from "../ui/components.js";
import { finishField, typeField } from "../ui/field-types.js";
import { closeSheet, sheetRoot } from "../ui/sheet.js";
import { ROASTN } from "../domain/vocabulary.js";
import { ui } from "../data/state.js";
import { bindLongPress } from "../ui/long-press.js";
import { readImport } from "../features/backup/import-data.js";
import { addFlavor, addMethod, methodChanged, saveBrew, updRatio } from "../features/brews/brew-form.js";
import { timerVisible } from "../features/brews/brew-timer.js";
import { saveCoffee } from "../features/coffees/coffee-form.js";
import { coffeeList } from "../features/coffees/coffee-list-page.js";
import { ITEM_MENU_TARGETS, openItemMenu } from "../features/item-menu/item-menu.js";
import { closeEditor, crop, edDraw, edLayout, editor, openEditor } from "../features/photos/photo-editor.js";
import { actions } from "./actions.js";
import { onHashChange } from "./router.js";

export function bindEvents() {
  /* Touching a slider, button or option while a text field is focused: let the text field go first.
     Otherwise it keeps focus (and the phone keyboard), and the browser scrolls back to it as soon as
     the slider changes the page. Plain scrolling is left alone. */
  document.addEventListener("pointerdown", e => {
    const active = document.activeElement;
    if (!isTypingField(active)) {
      return;
    }
    const ctl = e.target.closest("input, textarea, select, button, label, summary, a, [data-act]");
    if (!ctl || ctl === active) {
      return;
    }
    if (isTypingField(ctl) || (ctl.tagName === "LABEL" && isTypingField(ctl.control))) {
      return;  // moving to another text field: the browser handles that
    }
    active.blur();
  });
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) {
      return;
    }
    const fn = actions[el.dataset.act];
    if (fn) {
      e.preventDefault();
      fn(el.dataset.id, el);
    }
  });
  document.addEventListener("submit", e => {
    e.preventDefault();
    if (e.target.id === "coffee-form") {
      saveCoffee(e.target);
    } else if (e.target.id === "brew-form") {
      saveBrew(e.target);
    }
  });
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset && t.dataset.field) {
      typeField(t);
    }
    if (t.id === "q") {
      ui.q = t.value;
      $("#coffee-list").innerHTML = coffeeList();
    } else if (t.id === "b-rating") {
      const r = Number(t.value);
      t.style.setProperty("--p", r * 20 + "%");
      $("#rate-out").textContent = r ? fmtRate(r) : "–";
      $("#rate-pips").innerHTML = pips(r || null);
    } else if (t.id === "b-dose" || t.id === "b-water") {
      updRatio();
    } else if (t.id === "ed-ang") {
      crop.ang = Number(t.value) || 0;
      $("#ed-ang-out").textContent = crop.ang + "°";
      edDraw();
    } else if (t.id === "c-roast") {
      const n = ROASTN[Number(t.value) || 0];
      $("#c-roast-out").textContent = n;
      t.setAttribute("aria-valuetext", n);
    }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "method" && t.form && t.form.id === "brew-form") {
      methodChanged(t.value);
    } else if (t.id === "adv-toggle") {
      $("#adv-wrap").hidden = !t.checked;
    } else if (t.id === "c-process") {
      const on = t.value === "__custom";
      $("#c-process-box").hidden = !on;
      if (on) {
        $("#c-process-custom").focus();
      }
    } else if (t.id === "c-more") {
      $("#c-more-box").hidden = !t.checked;
    } else if (t.id === "photo-file" && t.files[0]) {
      const f = t.files[0];
      t.value = "";
      openEditor(URL.createObjectURL(f), true);
    } else if (t.id === "import-file" && t.files[0]) {
      const f = t.files[0];
      t.value = "";
      readImport(f);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !editor.hidden) {
      closeEditor();
      return;
    }
    if (e.key === "Escape" && sheetRoot.classList.contains("open")) {
      closeSheet();
    }
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.form && !e.target.name) {
      e.preventDefault();
      if (e.target.id === "new-method-name") {
        addMethod();
      } else if (e.target.id === "new-flavor-name") {
        addFlavor();
      }
    }
  });
  document.addEventListener("focusout", e => {
    if (e.target.dataset && e.target.dataset.field) {
      finishField(e.target);
    }
  });
  document.addEventListener("visibilitychange", timerVisible);
  bindLongPress(ITEM_MENU_TARGETS, openItemMenu);
  addEventListener("hashchange", onHashChange);
  addEventListener("resize", () => {
    if (!editor.hidden) {
      edLayout();
    }
  });
}
