/**
 * Built-in brew methods, custom (user-defined) methods and the advanced options each method offers.
 */
import { newId } from "../core/ids.js";
import { num, str } from "../core/validate.js";
import { keepExtra } from "./schema.js";
import { state } from "../data/state.js";

export const METHODS = [
  {
    id: "espresso", name: "Espresso", ab: "ES", c: "#D6334C", dose: 18, water: 36, temp: 93, time: "0:28", out: "Yield"
  },
  {
    id: "v60", name: "Pour-over", ab: "V60", c: "#1E88E5", dose: 15, water: 250, temp: 94, time: "2:45", pour: true
  },
  {
    id: "aeropress", name: "AeroPress", ab: "AP", c: "#F47B20", dose: 15, water: 220, temp: 88, time: "2:00"
  },
  {
    id: "frenchpress", name: "French press", ab: "FP", c: "#1F9D6B", dose: 30, water: 500, temp: 95, time: "4:00"
  },
  {
    id: "moka", name: "Moka pot", ab: "MK", c: "#7A4FD6", dose: 16, water: 150, temp: null, time: "4:00"
  },
  {
    id: "chemex", name: "Chemex", ab: "CX", c: "#0FA3B1", dose: 30, water: 500, temp: 94, time: "4:15", pour: true
  },
  {
    id: "batch", name: "Filter machine", ab: "FM", c: "#5B6B8C", dose: 60, water: 1000, temp: null, time: ""
  },
  {
    id: "coldbrew", name: "Cold brew", ab: "CB", c: "#2F6BD9", dose: 80, water: 1000, temp: null, time: ""
  },
  {
    id: "cezve", name: "Cezve", ab: "CZ", c: "#B8741A", dose: 8, water: 70, temp: null, time: "2:30"
  },
  {
    id: "other", name: "Other", ab: "··", c: "#8A93A3", dose: null, water: null, temp: null, time: ""
  }
];

export const MCOLORS = ["#C2187A", "#0B8A6B", "#B4530A", "#4457D6", "#8E3FBF", "#00838F", "#A33B2A", "#5A7D0C"];
export const customs = () => state.meta.methods || [];
export const allMethods = () => [...METHODS.slice(0, -1), ...customs(), METHODS[METHODS.length - 1]];
export const methodById = id => METHODS.find(m => m.id === id) || customs().find(m => m.id === id) || METHODS[METHODS.length - 1];

const abbr = n => {
  const w = n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return ((w.length > 1 ? w.map(x => x[0]).join("") : (w[0] || "?")).slice(0, 3)).toUpperCase();
};

export function normMethod(o) {
  o = o || {};
  const name = str(o.name, 30);
  return {
    id: /^x[a-z0-9]{6,24}$/.test(o.id || "") ? o.id : "x" + newId(), name, ab: abbr(name), c: /^#[0-9a-fA-F]{6}$/.test(o.c || "") ? o.c : MCOLORS[0], pour: !!o.pour
  };
}

/* extra options per method; pouring stages are separate and only for methods with pour:true */
export const ADV = {
  espresso: [{ k: "preinf", l: "Pre-infusion (s)", t: "num", max: 120 }, { k: "bar", l: "Pressure (bar)", t: "num", max: 20 }],
  aeropress: [{ k: "pos", l: "Position", t: "seg", o: ["Standard", "Inverted"] }, { k: "steep", l: "Steep before pressing", t: "dur", ph: "1:30" }],
  coldbrew: [{ k: "hours", l: "Steep time (hours)", t: "num", max: 200 }, { k: "where", l: "Steeped in", t: "seg", o: ["Fridge", "Room temp"] }],
  moka: [{ k: "start", l: "Water in the base", t: "seg", o: ["Cold", "Pre-heated"] }]
};

export function normExtra(method, e) {
  const out = {};
  e = e && typeof e === "object" ? e : {};
  if (methodById(method).id !== method) {
    return keepExtra(e, {});
  } /* a method this version does not know: keep its options untouched */
  (ADV[methodById(method).id] || []).forEach(d => {
    const v = e[d.k];
    if (d.t === "num") {
      const n = num(v, 0, d.max);
      if (n != null) {
        out[d.k] = n;
      }
    } else if (d.t === "seg") {
      if (d.o.includes(v)) {
        out[d.k] = v;
      }
    } else {
      const t = str(v, 20);
      if (t) {
        out[d.k] = t;
      }
    }
  });
  return out;
}

export const normStages = l => Array.isArray(l) ? l.slice(0, 12).map(x => ({ t: str(x && x.t, 8), g: num(x && x.g, 0, 50000), note: str(x && x.note, 40) })).filter(x => x.t || x.g != null || x.note) : [];
