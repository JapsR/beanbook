/**
 * Short status messages at the bottom of the screen.
 */
import { $ } from "../core/dom.js";

export function toast(t) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = t;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 3200);
}
