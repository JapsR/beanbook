/**
 * Small DOM helpers: element lookup and HTML escaping.
 */
export const $ = (s, r = document) => r.querySelector(s);

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const NOT_TYPED = new Set(["range", "checkbox", "radio", "button", "submit", "reset", "file", "color", "image"]);

/* True for fields that take typed text (and open the phone keyboard): text inputs, textareas, selects. */
export const isTypingField = el => !!el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable
  || (el.tagName === "INPUT" && !NOT_TYPED.has(el.type)));
