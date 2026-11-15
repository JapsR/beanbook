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
- Coffees are only ever ADDED. No coffee is deleted from catalog.json. (The one exception: entries that
  turn out not to be coffee at all, such as a grinder a shop filed under "coffee", are dropped.)
- A coffee that a shop no longer lists is kept and flagged "removed": true
  (with "removedAt"). If it comes back, the flag is cleared.
- If a shop cannot be reached, its coffees are left untouched (never flagged).
- Sold out is not the same as removed: a listed but sold-out coffee stays active.
- It reads robots.txt, identifies itself, and waits between requests.

Needs Python 3.8+ and nothing else. How a shop is read ("type" in sources.json):
  "shopify"      -> <shop>/products.json
  "woocommerce"  -> <shop>/wp-json/wc/store/v1/products
  "sitemap"      -> any other shop: its sitemap lists the pages, and each product page describes itself
                    in a standard block (schema.org Product). Slower, one page per product, so pages are
                    remembered in state.json and only new ones are read on later runs.
  "auto"         -> tries the three in that order
"""
import argparse
import datetime
import gzip
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
STATE = {}       # per shop: the product pages already read by the sitemap reader
PAGE_CAP = 80    # new pages read per shop per run by the sitemap reader
SKIP_PATH = re.compile(r"/(blogs?|nieuws|news|contact|account|cart|winkelwagen|checkout|pages?|categor[a-z]*|collections?|tags?|"
                       r"over-ons|about[a-z-]*|faq|service|klantenservice|recept[a-z]*|recipes?|vacatures|jobs|privacy[a-z-]*|"
                       r"voorwaarden|terms[a-z-]*|workshops?|cursus[a-z]*|training[a-z]*|locaties|locations|wp-content|author|"
                       r"zakelijk|b2b|horeca|login|wishlist|search|zoeken)(/|$)", re.I)
PRODUCT_PATH = re.compile(r"/(products?|produkt|producten|p|shop|winkel|webshop|koffie|koffiebonen|coffees?|bonen|beans)(/|-)", re.I)
GENERIC_CRUMBS = {"home", "shop", "webshop", "winkel", "producten", "products", "product", "alle producten", "all products", "start"}

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

    def text(self, url, pause=None, limit=3_000_000):
        if not self.allowed(url):
            raise RuntimeError("robots.txt does not allow " + url)
        wait = (self.delay if pause is None else pause) - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml,*/*"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read(limit)
        finally:
            self.last = time.time()
        if raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        return raw.decode("utf-8", "replace")

    def sitemaps(self, base):
        self.allowed(base + "/")
        p = urllib.parse.urlsplit(base)
        return list(self.robots[f"{p.scheme}://{p.netloc}"].site_maps() or [])

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


def host(url):
    return urllib.parse.urlsplit(url).netloc.lower().replace("www.", "", 1)


def sitemap_pages(f, base):
    """All page addresses a shop lists in its sitemap: {url: listed in a product sitemap?}."""
    queue = [(u, 0) for u in (f.sitemaps(base) or [base + "/sitemap.xml", base + "/sitemap_index.xml"])]
    seen, pages = set(), {}
    while queue and len(seen) < 25:
        url, depth = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            xml = f.text(url, pause=1.0, limit=20_000_000)
        except Exception:
            continue
        locs = [html.unescape(x.strip()) for x in re.findall(r"<loc>\s*(?:<!\[CDATA\[)?\s*(.*?)\s*(?:\]\]>)?\s*</loc>", xml, re.S)]
        if "<sitemapindex" in xml:
            product_maps = [k for k in locs if re.search(r"product", k, re.I)]
            if depth < 2:
                queue += [(k, depth + 1) for k in (product_maps or locs)[:20]]
        else:
            from_products = bool(re.search(r"product", url, re.I))
            for loc in locs[:8000]:
                if host(loc) == host(base):
                    pages[loc] = pages.get(loc, False) or from_products
    return pages


def product_from_page(page, url):
    """Read the schema.org Product block of a product page, or None when the page has none."""
    crumbs, product = [], None
    for raw in re.findall(r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", page, re.S | re.I):
        try:
            todo = [json.loads(raw.strip())]
        except ValueError:
            try:
                todo = [json.loads(html.unescape(raw.strip()))]
            except ValueError:
                continue
        while todo:
            d = todo.pop()
            if isinstance(d, list):
                todo += d
                continue
            if not isinstance(d, dict):
                continue
            todo += d.get("@graph", []) if isinstance(d.get("@graph"), list) else []
            types = d.get("@type") if isinstance(d.get("@type"), list) else [d.get("@type")]
            if "BreadcrumbList" in types:
                for el in d.get("itemListElement") or []:
                    item = el.get("item") if isinstance(el, dict) else None
                    name = (el.get("name") if isinstance(el, dict) else None) or (item.get("name") if isinstance(item, dict) else None)
                    if isinstance(name, str):
                        crumbs.append(plain(name))
            if ("Product" in types or "ProductGroup" in types) and isinstance(d.get("name"), str) and product is None:
                product = d
    if product is None:
        return None
    brand = product.get("brand")
    brand = brand.get("name") if isinstance(brand, dict) else brand
    cats = product.get("category")
    cats = [cats] if isinstance(cats, str) else [c for c in (cats or []) if isinstance(c, str)] if isinstance(cats, list) else []
    path = [seg for seg in urllib.parse.urlsplit(url).path.split("/") if seg]
    title = plain(product["name"])[:120]
    kinds = [k for k in cats + crumbs + [seg.replace("-", " ") for seg in path[:-1]]
             if k and k.strip().lower() not in GENERIC_CRUMBS and k.strip().lower() != title.lower()]
    desc = product.get("description")
    return {"p": 1, "handle": path[-1] if path else "home", "title": title, "vendor": brand if isinstance(brand, str) else "",
            "kinds": kinds[:8], "text": plain(desc)[:600] if isinstance(desc, str) else ""}


def fetch_sitemap(f, base, key):
    known = STATE.setdefault(key, {})
    pages = sitemap_pages(f, base)
    if not pages:
        raise RuntimeError("no sitemap found")
    ok = lambda u: not SKIP_PATH.search(urllib.parse.urlsplit(u).path) and urllib.parse.urlsplit(u).path.strip("/")
    cand = [u for u, prod in pages.items() if ok(u) and (prod or PRODUCT_PATH.search(urllib.parse.urlsplit(u).path + "/"))]
    if not cand:  # flat addresses such as /ethiopia-guji: look at every page that is not clearly something else
        cand = [u for u in pages if ok(u) and urllib.parse.urlsplit(u).path.strip("/").count("/") <= 2]
    new = [u for u in cand if u not in known][:PAGE_CAP]
    for u in new:
        try:
            known[u] = product_from_page(f.text(u, pause=1.0), u) or {"p": 0}
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                known[u] = {"p": 0}
        except Exception:
            pass  # try this page again on the next run
    live = set(cand)
    out = [dict(v, url=u) for u, v in known.items() if v.get("p") and u in live]
    left = sum(1 for u in cand if u not in known)
    f.info = f"sitemap: {len(cand)} candidate pages, {len(new)} read this run, {left} still to read, {len(out)} products"
    if not out:
        raise RuntimeError(f"sitemap reader found no product data ({f.info})")
    return out


def fetch_source(f, src, key):
    base = src["url"].rstrip("/")
    kind = src.get("type", "auto")
    readers = {"shopify": lambda: fetch_shopify(f, base), "woocommerce": lambda: fetch_woocommerce(f, base),
               "sitemap": lambda: fetch_sitemap(f, base, key)}
    f.info = ""
    errors = []
    for name in ([kind] if kind in readers else ["shopify", "woocommerce", "sitemap"]):
        try:
            products = readers[name]()
            f.reader = name
            return products
        except Exception as e:  # try the next reader
            errors.append(f"{name}: {e}")
    raise RuntimeError("; ".join(errors))


def has_word(hay, word):
    return re.search(r"(?<![a-zà-ÿ])" + re.escape(word) + r"(?![a-zà-ÿ])", hay) is not None


# Dutch and German glue words together (koffiemachine, koffiemolen), so these are matched anywhere in the text.
EXCLUDE_ANYWHERE = ["machine", "molen", "grinder", "kettle", "waterkoker", "dripper", "weegschaal", "tamper", "brewer",
                    "toolset", "pitcher", "melkkan", "opschuimer", "frother", "filterhouder", "portafilter", "ontkalk",
                    "reinig", "onderhoud", "accessoire", "thermos", "karaf", "carafe", "kopjes", "glazen", "bekers",
                    "servies", "onderdelen", "spare part", "barista tool", "knockbox", "uitklopbak",
                    "jura", "quick mill", "mahlkonig", "mahlkönig", "macap", "wilfa", "hario", "brewista", "comandante",
                    "timemore", "fellow", "sage ", "rocket", "bezzera", "eureka", "rancilio", "lelit", "ecm ", "profitec",
                    "moccamaster", "kalita", "bialetti", "kinto", "acme", "puqpress", "baratza", "mazzer", "quamar", "quickmill",
                    "nivona", "everpure", "brita", "sanremo", "beker", "ecoffee", "testset", "filterbakje", "barista attitude",
                    "abonnement", "giftcard", "cadeau", "proefpakket apparaat"]


def is_junk(text):
    """True for equipment, merchandise and other things that are never a coffee."""
    text = text.lower()
    return any(x in text for x in EXCLUDE_ANYWHERE) or any(starts_word(text, x) for x in EXCLUDE)


def clean_name(name):
    """Drop shop housekeeping words such as 'Archived' from a product title."""
    name = re.sub(r"(?i)^\s*archived?\s*[:\-|]\s*", "", name)
    name = re.sub(r"(?i)\s*[\-|(]\s*archived?\)?\s*$", "", name)
    return name.strip()


def starts_word(hay, word):
    """Short words must match whole; longer ones may be the start of a word (grinder -> grinders)."""
    tail = r"(?![a-zà-ÿ])" if len(word) <= 4 else ""
    return re.search(r"(?<![a-zà-ÿ])" + re.escape(word) + tail, hay) is not None


COFFEE_KINDS = {"coffee", "coffees", "koffie", "koffies", "kaffee", "café", "cafe", "coffee beans", "koffiebonen",
                "bonen", "beans", "espresso", "espressobonen", "filter", "filter coffee", "filterkoffie", "single origin",
                "single origins", "single estate", "blend", "blends", "roasted coffee", "whole bean", "whole bean coffee",
                "specialty coffee", "specialty koffie", "omni", "decaf", "cafeïnevrij"}
COFFEE_HINTS = ["koffiebonen", "coffee beans", "espressobonen", "filterkoffie", "single origin", "whole bean"]


def is_coffee(p, src):
    """A product counts as coffee when its type or a tag says so, or its title names a coffee origin,
    and neither its title nor its product type looks like equipment or merchandise."""
    kinds = [k.strip().lower() for k in p["kinds"] if k and k.strip()]
    ptype = kinds[0] if kinds else ""
    title = p["title"].lower()
    extra_out = [x.lower() for x in src.get("exclude", [])]
    if is_junk(title) or is_junk(ptype) or any(x in title or x in ptype for x in extra_out):
        return False
    wanted = COFFEE_KINDS | {x.lower() for x in src.get("include", [])}
    if any(k in wanted for k in kinds) or any(h in k for k in kinds for h in COFFEE_HINTS):
        return True
    return detect_origin(title) != ""


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
        "name": clean_name(p["title"])[:80],
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
            if not is_junk(it.get("name", "")):  # drop anything an earlier, looser filter let in by mistake
                catalog[it["id"]] = it
    today = datetime.date.today().isoformat()
    fetcher = Fetcher(args.delay)
    state_file = pathlib.Path(args.sources).with_name("state.json")
    if state_file.exists():
        STATE.update(json.loads(state_file.read_text(encoding="utf-8")))
    failed = 0
    report = []
    for src in sources:
        if src.get("enabled") is False:
            continue
        key = slug(urllib.parse.urlsplit(src["url"]).netloc)
        try:
            products = fetch_source(fetcher, src, key)
        except Exception as e:
            failed += 1
            log(f"! {src['url']}: skipped ({e}). Its coffees are left as they were.")
            report.append({"url": src["url"], "ok": False, "error": str(e)[:300]})
            continue
        found = []
        for p in products:
            if is_coffee(p, src):
                found.append(to_item(p, src, src.get("roaster") or p["vendor"] or src.get("name") or key))
        kind_of = lambda p: (p["kinds"][0] if p["kinds"] and p["kinds"][0] else "(none)")[:40]
        taken, left = {}, {}
        for p in products:
            bucket = taken if is_coffee(p, src) else left
            bucket[kind_of(p)] = bucket.get(kind_of(p), 0) + 1
        top = lambda d: dict(sorted(d.items(), key=lambda kv: -kv[1])[:8])
        report.append({"url": src["url"], "ok": True, "reader": fetcher.reader, "info": fetcher.info, "products": len(products), "coffees": len(found),
                       "taken_types": top(taken), "skipped_types": top(left),
                       "skipped_examples": [p["title"][:60] for p in products if not is_coffee(p, src)][:5]})
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
        state_file.write_text(json.dumps(STATE, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        rep = pathlib.Path(args.sources).with_name("report.json")
        rep.write_text(json.dumps({"ranAt": result["updatedAt"], "sources": report}, ensure_ascii=False, indent=1), encoding="utf-8")
    return 1 if failed and failed == len([s for s in sources if s.get("enabled") is not False]) else 0


if __name__ == "__main__":
    sys.exit(main())
