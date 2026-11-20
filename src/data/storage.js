/**
 * Persistence. Uses private per-person cloud documents when the host offers them, else IndexedDB in this browser, else memory only.
 */
import { newId } from "../core/ids.js";
import { toast } from "../ui/toast.js";
import { state } from "./state.js";

export const Store = {
  mode: "memory", col: null, idb: null, q: {},
  async init() {
    const use = n => window.claude && typeof window.claude.use === "function" ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
    try {
      const [db, user] = await Promise.all([use("db"), use("user")]);
      this.db = db;
      this.user = user;
      const uid = user ? await user.id() : null;
      if (db && uid) {
        this.col = db.collection("data/users/" + uid);
        const snap = await Promise.race([this.col.get(), new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), 10000))]);
        const out = {};
        snap.docs.forEach(d => {
          if (d.exists) {
            out[d.id] = JSON.parse(JSON.stringify(d.data()));
          }
        });
        let canWrite = true;
        if (!Object.keys(out).length) {
          try {
            await this.col.doc("meta").set({
              k: "meta", badges: {}, exports: 0, demoOff: false, methods: []
            });
          } catch (e) {
            canWrite = false;
          }
        }
        if (canWrite) {
          this.mode = "cloud";
          return out;
        }
        this.col = null; /* this viewer may not save to the page: keep their data in this browser instead */
      }
    } catch (e) {
      if (this.col) {
        this.col = null;
        return null;
      }
    }
    try {
      this.idb = await new Promise((res, rej) => {
        const r = indexedDB.open("beanbook", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(0);
        setTimeout(() => rej(0), 4000);
      });
      const out = await new Promise((res, rej) => {
        const o = {};
        const c = this.idb.transaction("kv").objectStore("kv").openCursor();
        c.onsuccess = () => {
          const cur = c.result;
          if (cur) {
            o[cur.key] = cur.value;
            cur.continue();
          } else {
            res(o);
          }
        };
        c.onerror = () => rej(c.error);
      });
      this.mode = "local";
      return out;
    } catch (e) {
      this.mode = "memory";
      return {};
    }
  },
  run(key, fn) {
    this.q[key] = (this.q[key] || Promise.resolve()).then(fn).catch(e => {
      toast(e && e.code === "quota_exceeded" ? "Storage is full. Remove some photos or old entries." : "Could not save that change. Export a backup to be safe.");
    });
    return this.q[key];
  },
  put(key, body) {
    const b = JSON.parse(JSON.stringify(body));
    if (this.mode === "cloud") {
      return this.run(key, () => this.col.doc(key).set(b));
    }
    if (this.mode === "local") {
      return this.run(key, () => new Promise((res, rej) => {
        const t = this.idb.transaction("kv", "readwrite");
        t.objectStore("kv").put(b, key);
        t.oncomplete = res;
        t.onerror = () => rej(t.error);
      }));
    }
    return Promise.resolve();
  },
  del(key) {
    if (this.mode === "cloud") {
      return this.run(key, () => this.col.doc(key).delete());
    }
    if (this.mode === "local") {
      return this.run(key, () => new Promise((res, rej) => {
        const t = this.idb.transaction("kv", "readwrite");
        t.objectStore("kv").delete(key);
        t.oncomplete = res;
        t.onerror = () => rej(t.error);
      }));
    }
    return Promise.resolve();
  }
};

export const saveMeta = () => Store.put("meta", { k: "meta", ...state.meta });

export function addPhoto(data) {
  const id = newId();
  state.photos[id] = data;
  Store.put("p_" + id, { k: "photo", d: data });
  return id;
}

export function delPhoto(id) {
  if (id && state.photos[id]) {
    delete state.photos[id];
    Store.del("p_" + id);
  }
}
