/**
 * Data format and compatibility.
 *
 * SCHEMA is the version of the stored data and of export files. Rules that keep old and new data compatible:
 *   1. New fields are optional and get a default in normCoffee / normBrew, so old records load unchanged.
 *   2. Fields, methods, flavours and badges this version does not know are kept as they are, so data
 *      written by a newer version survives being opened, edited and exported here.
 *   3. A change that renames or reshapes existing fields raises SCHEMA and adds a step to MIGRATIONS;
 *      stored data and imported files are upgraded step by step from whatever version they have.
 */
export const SCHEMA = 1;

/* Example step: 2: { coffee: c => ({ ...c, newField: c.oldField }), brew: b => b } */
const MIGRATIONS = {};

export function upgrade(kind, rec, from) {
  let r = rec;
  for (let v = from + 1; v <= SCHEMA; v++) {
    const m = MIGRATIONS[v];
    if (m && m[kind]) {
      r = m[kind]({ ...r });
    }
  }
  return r;
}

/* Copies fields this version does not know onto a normalised record, so nothing is lost. */
export function keepExtra(o, out) {
  let n = 0;
  for (const [key, v] of Object.entries(o || {})) {
    if (key in out || key === "demo" || key === "k" || !/^[A-Za-z][A-Za-z0-9]{0,30}$/.test(key)) {
      continue;
    }
    let j;
    try {
      j = JSON.stringify(v);
    } catch (e) {
      continue;
    }
    if (j === undefined || j.length > 2000 || ++n > 20) {
      continue;
    }
    out[key] = JSON.parse(j);
  }
  return out;
}
