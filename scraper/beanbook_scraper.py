#!/usr/bin/env python3
"""
Beanbook catalog scraper
========================
Collects the coffees that roasters list in their web shops and keeps one
growing catalog file that the Beanbook app can load.

    python3 beanbook_scraper.py                      # uses sources.json, writes catalog.json
    python3 beanbook_scraper.py --sources my.json --out catalog.json
    python3 beanbook_scraper.py --dry-run            # show what would change, write nothing

Rules it follows
- Coffees are only ever ADDED. Nothing is deleted from catalog.json.
- A coffee that a shop no longer lists is kept and flagged "removed": true
  (with "removedAt"). If it comes back, the flag is cleared.
- If a shop cannot be reached, its coffees are left untouched (never flagged).
- Sold out is not the same as removed: a listed but sold-out coffee stays active.
- It reads robots.txt, identifies itself, and waits between requests.

Needs Python 3.8+ and nothing else. Supported shop platforms:
  "shopify"      -> <shop>/products.json
  "woocommerce"  -> <shop>/wp-json/wc/store/v1/products
  "auto"         -> tries both
"""
import argparse
import datetime
import html
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

USER_AGENT = "BeanbookCatalogBot/1.0 (personal coffee catalog; low volume)"
MAX_PAGES = 40

# word in the shop text -> value stored in the catalog (English), longest names first when matching
ORIGINS = {
    "ethiopia": "Ethiopia", "ethiopie": "Ethiopia", "ethiopië": "Ethiopia", "äthiopien": "Ethiopia",
    "colombia": "Colombia", "kolumbien": "Colombia", "brazil": "Brazil", "brasil": "Brazil",
    "brazilie": "Brazil", "brazilië": "Brazil", "brasilien": "Brazil", "kenya": "Kenya", "kenia": "Kenya",
    "rwanda": "Rwanda", "ruanda": "Rwanda", "burundi": "Burundi", "guatemala": "Guatemala",
    "honduras": "Honduras", "costa rica": "Costa Rica", "el salvador": "El Salvador",
    "nicaragua": "Nicaragua", "panama": "Panama", "peru": "Peru", "ecuador": "Ecuador",
    "bolivia": "Bolivia", "mexico": "Mexico", "indonesia": "Indonesia", "indonesie": "Indonesia",
    "indonesië": "Indonesia", "sumatra": "Indonesia", "india": "India", "vietnam": "Vietnam",
    "tanzania": "Tanzania", "uganda": "Uganda", "dr congo": "DR Congo", "congo": "DR Congo",
    "yemen": "Yemen", "china": "China", "yunnan": "China", "myanmar": "Myanmar", "thailand": "Thailand",
    "papua new guinea": "Papua New Guinea",
}
PROCESSES = [  # checked in order
    ("Decaf", ["decaf", "cafeïnevrij", "cafeinevrij", "entkoffeiniert"]),
    ("Anaerobic", ["anaerobic", "anaeroob", "carbonic", "thermal shock"]),
    ("Wet-hulled", ["wet-hulled", "wet hulled", "giling basah"]),
    ("Honey", ["honey", "pulped natural"]),
    ("Natural", ["natural", "naturel", "ongewassen", "dry process"]),
    ("Washed", ["washed", "gewassen", "gewaschen", "wet process"]),
]
ROASTS = [("light", ["light roast", "licht gebrand", "lichte branding"]),
          ("dark", ["dark roast", "donker gebrand", "donkere branding"]),
          ("medium", ["medium roast", "medium gebrand", "medium branding"])]
# a product counts as coffee when one of these appears in its type, tags or categories ...
INCLUDE = ["coffee", "koffie", "kaffee", "café", "cafe", "espresso", "filter", "beans", "bonen", "single origin", "blend"]
# ... and none of these appears in its type, tags, categories or title
EXCLUDE = ["grinder", "molen", "kettle", "waterkoker", "dripper", "filter paper", "paper filter", "filters",
           "papier", "mug", "mugs", "cup", "cups", "glass", "glas", "server", "scale", "weegschaal", "tamper",
           "machine", "brewer", "aeropress", "french press", "chemex", "moka pot", "t-shirt", "shirt",
           "tote", "merch", "gift card", "cadeaubon", "cadeaukaart", "voucher", "subscription",
           "abonnement", "workshop", "course", "cursus", "training", "cleaning", "ontkalk", "book", "boek",
           "tea", "thee", "chocolate", "chocola", "syrup", "siroop", "sample pack", "equipment", "accessor"]


def log(*a):
    print(*a, file=sys.stderr)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")[:50] or "unknown"


def plain(markup):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", markup or ""))).strip()


class Fetcher:
    def __init__(self, delay):
        self.delay = delay
        self.robots = {}
        self.last = 0.0

    def allowed(self, url):
        p = urllib.parse.urlsplit(url)
        root = f"{p.scheme}://{p.netloc}"
        if root not in self.robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                req = urllib.request.Request(root + "/robots.txt", headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=20) as r:
                    rp.parse(r.read().decode("utf-8", "replace").splitlines())
            except Exception:
                rp.parse([])  # no readable robots.txt: nothing is disallowed
            self.robots[root] = rp
        return self.robots[root].can_fetch(USER_AGENT, url)

    def json(self, url):
        if not self.allowed(url):
            raise RuntimeError("robots.txt does not allow " + url)
        wait = self.delay - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8", "replace"))
        finally:
            self.last = time.time()


def as_list(v):
    if isinstance(v, str):
        return [x.strip() for x in v.split(",") if x.strip()]
    return [str(x.get("name", "")) if isinstance(x, dict) else str(x) for x in (v or [])]


def fetch_shopify(f, base):
    out, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        data = f.json(f"{base}/products.json?limit=250&page={page}")
        products = data.get("products") if isinstance(data, dict) else None
        if products is None:
            raise RuntimeError("not a Shopify product feed")
        fresh = [p for p in products if p.get("id") not in seen]
        if not fresh:
            break
        for p in fresh:
            seen.add(p.get("id"))
            out.append({"handle": p.get("handle") or str(p.get("id")), "title": p.get("title") or "",
                        "vendor": p.get("vendor") or "", "kinds": [p.get("product_type") or ""] + as_list(p.get("tags")),
                        "text": plain(p.get("body_html")), "url": f"{base}/products/{p.get('handle')}"})
        if len(products) < 250:
            break
    return out


def fetch_woocommerce(f, base):
    out, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        data = f.json(f"{base}/wp-json/wc/store/v1/products?per_page=100&page={page}")
        if not isinstance(data, list):
            raise RuntimeError("not a WooCommerce product feed")
        fresh = [p for p in data if p.get("id") not in seen]
        if not fresh:
            break
        for p in fresh:
            seen.add(p.get("id"))
            out.append({"handle": p.get("slug") or str(p.get("id")), "title": plain(p.get("name")), "vendor": "",
                        "kinds": as_list(p.get("categories")) + as_list(p.get("tags")),
                        "text": plain((p.get("short_description") or "") + " " + (p.get("description") or "")),
                        "url": p.get("permalink") or base})
        if len(data) < 100:
            break
    return out


def fetch_source(f, src):
    base = src["url"].rstrip("/")
    kind = src.get("type", "auto")
    if kind == "shopify":
        return fetch_shopify(f, base)
    if kind == "woocommerce":
        return fetch_woocommerce(f, base)
    errors = []
    for fn in (fetch_shopify, fetch_woocommerce):
        try:
            return fn(f, base)
        except Exception as e:  # try the next platform
            errors.append(f"{fn.__name__}: {e}")
    raise RuntimeError("; ".join(errors))


def has_word(hay, word):
    return re.search(r"(?<![a-zà-ÿ])" + re.escape(word) + r"(?![a-zà-ÿ])", hay) is not None


def starts_word(hay, word):
    """Short words must match whole; longer ones may be the start of a word (grinder -> grinders)."""
    tail = r"(?![a-zà-ÿ])" if len(word) <= 4 else ""
    return re.search(r"(?<![a-zà-ÿ])" + re.escape(word) + tail, hay) is not None


def is_coffee(p, src):
    kinds = " | ".join(p["kinds"]).lower()
    title = p["title"].lower()
    exclude = EXCLUDE + [x.lower() for x in src.get("exclude", [])]
    include = INCLUDE + [x.lower() for x in src.get("include", [])]
    if any(starts_word(kinds, x) or starts_word(title, x) for x in exclude):
        return False
    return any(x in kinds for x in include) or detect_origin(title + " " + kinds) != ""


def detect_origin(text):
    text = text.lower()
    found = []
    for word in sorted(ORIGINS, key=len, reverse=True):
        if has_word(text, word) and ORIGINS[word] not in found:
            found.append(ORIGINS[word])
    if len(found) == 1:
        return found[0]
    return "Blend" if len(found) > 1 and has_word(text, "blend") else (found[0] if found else "")


def detect(pairs, text):
    text = text.lower()
    for value, words in pairs:
        if any(has_word(text, w) for w in words):
            return value
    return ""


def to_item(p, src, roaster):
    head = p["title"] + " " + " ".join(p["kinds"])
    everything = head + " " + p["text"][:1500]
    return {
        "id": f"{slug(roaster)}:{slug(p['handle'])}",
        "name": p["title"].strip()[:80],
        "roaster": roaster[:60],
        "origin": detect_origin(head) or detect_origin(everything),
        "process": detect(PROCESSES, head) or detect(PROCESSES, everything),
        "roast": detect(ROASTS, everything),
        "url": p["url"],
    }


def merge(catalog, source_key, found, today):
    """Add new coffees, refresh known ones, flag the ones this source stopped listing. Never deletes."""
    added = back = gone = 0
    ids = set()
    for it in found:
        ids.add(it["id"])
        old = catalog.get(it["id"])
        if old is None:
            added += 1
            catalog[it["id"]] = {**it, "source": source_key, "firstSeen": today, "lastSeen": today, "removed": False}
        else:
            if old.get("removed"):
                back += 1
            old.update(it)
            old.update({"source": source_key, "lastSeen": today, "removed": False})
            old.pop("removedAt", None)
    for cid, old in catalog.items():
        if old.get("source") == source_key and cid not in ids and not old.get("removed"):
            old["removed"] = True
            old["removedAt"] = today
            gone += 1
    return added, back, gone


def main():
    here = pathlib.Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Update the Beanbook coffee catalog from roaster web shops.")
    ap.add_argument("--sources", default=str(here / "sources.json"))
    ap.add_argument("--out", default=str(here / "catalog.json"))
    ap.add_argument("--delay", type=float, default=2.0, help="seconds between requests (default 2)")
    ap.add_argument("--dry-run", action="store_true", help="report changes without writing the file")
    args = ap.parse_args()

    sources = json.loads(pathlib.Path(args.sources).read_text(encoding="utf-8"))["sources"]
    out = pathlib.Path(args.out)
    catalog = {}
    if out.exists():
        for it in json.loads(out.read_text(encoding="utf-8")).get("items", []):
            catalog[it["id"]] = it
    today = datetime.date.today().isoformat()
    fetcher = Fetcher(args.delay)
    failed = 0
    for src in sources:
        if src.get("enabled") is False:
            continue
        key = slug(urllib.parse.urlsplit(src["url"]).netloc)
        try:
            products = fetch_source(fetcher, src)
        except Exception as e:
            failed += 1
            log(f"! {src['url']}: skipped ({e}). Its coffees are left as they were.")
            continue
        found = []
        for p in products:
            if is_coffee(p, src):
                found.append(to_item(p, src, src.get("roaster") or p["vendor"] or src.get("name") or key))
        if products and not found:
            log(f"! {src['url']}: {len(products)} products but none looked like coffee. Left untouched; "
                f"add \"include\" words for this source.")
            continue
        added, back, gone = merge(catalog, key, found, today)
        log(f"  {src['url']}: {len(found)} coffees listed, {added} new, {back} back, {gone} no longer listed")

    items = sorted(catalog.values(), key=lambda i: (i["roaster"].lower(), i["name"].lower()))
    result = {"format": "beanbook-catalog", "version": 1,
              "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
              "items": items}
    active = sum(1 for i in items if not i.get("removed"))
    log(f"Catalog: {len(items)} coffees in total, {active} currently listed, {len(items) - active} flagged removed.")
    if args.dry_run:
        log("Dry run: nothing written.")
    else:
        tmp = out.with_suffix(".tmp")
        tmp.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(out)
        log(f"Wrote {out}")
    return 1 if failed and failed == len([s for s in sources if s.get("enabled") is not False]) else 0


if __name__ == "__main__":
    sys.exit(main())
