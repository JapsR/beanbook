/**
 * Hash-based routing: #coffees, #journal, #badges, #data, #coffee-<id>, #brew-<id>.
 */
import { closeSheet } from "../ui/sheet.js";
import { render } from "./render.js";

let cur = "coffees";

export const TABS = [["coffees", "Coffees", "bean"], ["journal", "Journal", "book"], ["badges", "Badges", "medal"], ["data", "Data", "data"]];

export function route() {
  if (cur.startsWith("coffee-")) {
    return { v: "coffee", id: cur.slice(7) };
  }
  if (cur.startsWith("brew-")) {
    return { v: "brew", id: cur.slice(5) };
  }
  return { v: TABS.some(t => t[0] === cur) ? cur : "coffees" };
}

export function go(h) {
  cur = h;
  try {
    if (location.hash.slice(1) !== h) {
      location.hash = h;
    }
  } catch (e) {
  }
  render(true);
}

export const setCurrentRoute = h => {
  cur = h;
};

export const onHashChange = () => {
  const h = location.hash.slice(1);
  if (h && h !== cur) {
    cur = h;
    closeSheet();
    render(true);
  }
};
