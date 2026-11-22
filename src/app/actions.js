/**
 * Maps every data-act="<name>" in the markup to its handler. Feature folders own their handlers; navigation lives here.
 */
import { closeSheet } from "../ui/sheet.js";
import { ui } from "../data/state.js";
import { backupActions } from "../features/backup/backup-actions.js";
import { badgeActions } from "../features/badges/badge-actions.js";
import { brewActions } from "../features/brews/brew-actions.js";
import { coffeeActions } from "../features/coffees/coffee-actions.js";
import { itemMenuActions } from "../features/item-menu/item-menu.js";
import { photoActions } from "../features/photos/photo-actions.js";
import { boot } from "./main.js";
import { fab, render } from "./render.js";
import { go } from "./router.js";

export const actions = {
  ...coffeeActions, ...brewActions, ...photoActions, ...badgeActions, ...backupActions, ...itemMenuActions,
  tab: id => go(id), open: id => go(id), "close-sheet": () => closeSheet(),
  fab: () => {
    const d = fab.dataset.do;
    actions[d] && actions[d](fab.dataset.id);
  },
  filter: id => {
    ui.filter = id;
    render();
  }, jm: id => {
    ui.jm = id;
    render();
  },
  retry: () => boot()
};
