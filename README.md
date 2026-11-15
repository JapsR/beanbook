# Beanbook

A phone-first web app to track the coffees you buy, how you prepare them and how they taste.
Everything a user enters stays on their own device. The only shared data is the public coffee
catalog, which a scheduled job collects from roaster web shops.

    site/        the app (index.html, offline support, icons) and catalog.json
    scraper/     beanbook_scraper.py and sources.json (the list of roaster shops)
    .github/     the workflow that runs the scraper and publishes the site

## One-time setup

1. Create a new **public** repository on GitHub and upload everything in this folder,
   keeping the folder structure (including the hidden `.github` folder).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Actions tab → "Update catalog and publish" → Run workflow.** The first run scrapes the
   shops, saves `site/catalog.json` and publishes the app.
4. Open the address shown under Settings → Pages (usually `https://<you>.github.io/<repo>/`)
   on your phone and choose "Add to Home screen".

After that it runs by itself every Monday and Thursday.

## Changing which shops are covered

Edit `scraper/sources.json` and commit. Each entry is one roaster web shop (Shopify or
WooCommerce). Check the log of a workflow run to see which shops were read and which were
skipped. Coffees are only ever added; one that a shop stops listing stays in the catalog
with `"removed": true`.

## Moving your data

Data → Export in the app writes one file with coffees, preparations, photos and badges.
Data → Import reads it on another device, or in this app from the Claude version.

## Run the scraper by hand

    python3 scraper/beanbook_scraper.py --out site/catalog.json --dry-run
