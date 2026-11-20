/**
 * Writes everything to one timestamped JSON file.
 */
import { localStamp } from "../../core/dates.js";
import { toast } from "../../ui/toast.js";
import { customs } from "../../domain/brew-methods.js";
import { SCHEMA } from "../../domain/schema.js";
import { brews, coffees, state } from "../../data/state.js";
import { saveMeta } from "../../data/storage.js";
import { checkBadges } from "../badges/badge-progress.js";
import { render } from "../../app/render.js";

export async function doExport() {
  if (state.demo || !coffees().length) {
    toast("Nothing to export yet. Add a coffee first.");
    return;
  }
  const data = JSON.stringify({
    format: "beanbook", version: SCHEMA, app: "Beanbook", exportedAt: new Date().toISOString(), exportedAtLocal: localStamp(),
    coffees: coffees().map(({ k, ...c }) => c), brews: brews().map(({ k, ...b }) => b), photos: state.photos, badges: state.meta.badges, methods: customs()
  }, null, 1);
  const filename = `beanbook-${localStamp().replace("T", "-").replace(":", "")}.json`;
  let ok = false;
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
    if (dl) {
      await dl.save({ filename, data });
      ok = true;
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      ok = true;
    }
  } catch (e) {
    toast(e && e.code === "declined" ? "Export cancelled." : "Export is not available in this view. Open the page in a browser and try again.");
    return;
  }
  if (ok) {
    state.meta.exports = (state.meta.exports || 0) + 1;
    saveMeta();
    toast("Export ready: " + filename);
    render();
    checkBadges();
  }
}
