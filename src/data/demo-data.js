/**
 * Example coffees and preparations shown until the user adds their first real coffee.
 */
import { dayOf, localStamp } from "../core/dates.js";
import { normBrew, normCoffee } from "../domain/records.js";
import { state } from "./state.js";

export function loadDemo() {
  const at = (days, t) => dayOf(localStamp(new Date(Date.now() - days * 864e5))) + "T" + t;
  const d = n => dayOf(at(n, "00:00"));
  const C = [["demo0001", "Guji Hambela", "Friedhats", "Ethiopia", "Natural", "light", "beans", 12, 250, 14.5],
    ["demo0002", "La Esperanza", "Manhattan Coffee", "Colombia", "Washed", "medium", "beans", 20, 250, 16],
    ["demo0003", "House Espresso", "Local roastery", "Brazil", "Natural", "dark", "ground", 30, 500, 11.9]];
  C.forEach(([id, name, roaster, origin, process, roast, form, age, weight, price]) => {
    state.coffees[id] = { ...normCoffee({
        id, name, roaster, origin, process, roast, form, roastDate: d(age + 6), bought: d(age), weight, price
      }), demo: true };
  });
  const B = [["demo1001", "demo0001", "v60", 1, "08:10", 15, 250, 94, "2:50", "22 clicks", 4.5, ["Blueberry", "Floral", "Juicy"], "Sweet and clean. Finer than last time, which fixed the sourness."],
    ["demo1002", "demo0001", "v60", 3, "08:25", 15, 250, 92, "2:20", "26 clicks", 3.25, ["Sour", "Citrus"], "Ran through too fast."],
    ["demo1003", "demo0001", "aeropress", 5, "15:40", 16, 220, 88, "2:00", "18 clicks", 4, ["Berry", "Black tea"], ""],
    ["demo1004", "demo0002", "espresso", 2, "07:50", 18, 38, 93, "0:29", "2.4", 4.25, ["Caramel", "Cherry", "Creamy"], "Good with milk too."],
    ["demo1005", "demo0002", "frenchpress", 6, "10:15", 30, 500, 95, "4:00", "coarse", 3.5, ["Chocolate", "Nutty"], ""],
    ["demo1006", "demo0003", "moka", 9, "09:05", 16, 150, null, "4:10", "", 2.75, ["Bitter", "Smoky"], "Pre-ground is a bit stale by now."]];
  B.forEach(([id, coffeeId, method, days, t, dose, water, temp, time, grind, rating, flavors, notes]) => {
    state.brews[id] = { ...normBrew({
        id, method, date: at(days, t), dose, water, temp, time, grind, rating, flavors, notes
      }), coffeeId, demo: true };
  });
  state.demo = true;
}

export function dropDemo() {
  if (!state.demo) {
    return;
  }
  state.coffees = {};
  state.brews = {};
  state.demo = false;
}
