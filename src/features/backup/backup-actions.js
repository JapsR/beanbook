/**
 * Button handlers for export, import and deleting all data.
 */
import { closeSheet, confirmSheet } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { wipe } from "../../data/mutations.js";
import { state } from "../../data/state.js";
import { saveMeta } from "../../data/storage.js";
import { doExport } from "./export-data.js";
import { runImport } from "./import-data.js";
import { go } from "../../app/router.js";

export const backupActions = {
  export: () => doExport(), "import-merge": () => runImport(false), "import-replace": () => runImport(true),
  "ask-wipe": () => confirmSheet("Delete all your data?", "Every coffee, preparation and photo is removed. Your badges stay. Export first if you want a copy.", "Delete everything", "wipe"),
  wipe: () => {
    wipe();
    state.meta.demoOff = true;
    saveMeta();
    closeSheet();
    go("coffees");
    toast("All data deleted");
  }
};
