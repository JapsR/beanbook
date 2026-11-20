# Architecture

Beanbook is a dependency-free, single-page web app written in plain JavaScript (ES modules) and CSS.
The source is split by responsibility; the build joins it back into one file for speed.

## Layers

Imports should point downwards in this list. Upward imports only exist for wiring (for example a
form handler calling `render()` or `go()` after saving).

| Layer | Folder | Knows about | Examples |
|---|---|---|---|
| App | `src/app/` | everything | `main.js` boots, `router.js`, `render.js`, `actions.js`, `events.js` |
| Features | `src/features/<feature>/` | ui, data, domain, core | `coffee-form.js`, `badges-page.js` |
| UI kit | `src/ui/` | core | `sheet.js`, `toast.js`, `icons.js` |
| Data | `src/data/` | domain, core | `state.js`, `storage.js`, `hydrate.js` |
| Domain | `src/domain/` | core | `schema.js`, `records.js`, `brew-methods.js` |
| Core | `src/core/` | nothing | `dates.js`, `validate.js`, `format.js` |

## How a screen is drawn

1. `app/main.js` binds the event listeners, loads stored documents (`data/storage.js`), turns them
   into state (`data/hydrate.js`) and calls `render()`.
2. `app/router.js` keeps the current route in the URL hash (`#coffees`, `#coffee-<id>`, …).
3. `app/render.js` picks the page function (`coffeesPage`, `journalPage`, …) and writes its HTML.
   Pages are pure functions of state that return an HTML string; every user value goes through `esc()`.

## How a click is handled

Interactive elements carry `data-act="<action>"` and, where needed, `data-id`. One delegated listener
(`app/events.js`) looks the action up in the table built in `app/actions.js`, which merges the
`*Actions` objects exported by each feature. To add a button: add the markup with a new `data-act`
name, then add the handler to that feature's `*-actions.js`.

## Data

- **State** lives in `data/state.js` (`state.coffees`, `state.brews`, `state.photos`, `state.meta`).
- **Records** are always passed through `normCoffee` / `normBrew` (`domain/records.js`) before they are
  stored or shown. Unknown fields are kept (`keepExtra`), so data written by a newer version survives.
- **Storage** (`data/storage.js`) saves each record as its own document: `c_<id>`, `b_<id>`, `p_<id>`
  (photo) and `meta`. It uses the host's private per-user cloud storage when available, otherwise
  IndexedDB, otherwise memory only.
- **Schema changes**: bump `SCHEMA` in `domain/schema.js` and add a step to `MIGRATIONS`. Stored data
  and imported files are upgraded step by step. Never rename or reshape a field without a migration.

## Build

`scripts/build.mjs` has no dependencies:

- CSS: inlines every file from `src/styles/main.css` in its `@import` order, then strips comments and
  whitespace.
- JS: walks the import graph from `src/app/main.js` depth-first (the order browsers evaluate modules
  in), removes `import` lines and `export` keywords, and wraps the result in one IIFE.

- Static files: everything in `public/` (service worker, web app manifest, icons) is copied into
  `dist/` unchanged. The development server serves `public/` alongside `src/`.

Because the bundle shares one scope, the build enforces three rules and fails with a clear message
otherwise:

1. Top-level names are unique across `src/`.
2. Imports use the form `import { a, b } from "./file.js"` (no `as`, default or namespace imports).
3. Exports use `export const` / `export function` (no `export default` or `export { … }`).

## Offline and installing

`public/sw.js` serves the app from a cache and refreshes it in the background, so the newest version
appears on the visit after a deploy. `app/main.js` registers it on HTTPS only and asks the browser to
keep the stored data (`navigator.storage.persist()`).

## README image

`scripts/readme-header.mjs` screenshots the built app with the example coffees at a fixed date and
lays the screens out as `docs/images/header.png`. The publish workflow runs it on every push to
`main` and commits the image only when it changed.

## CSS

Files are listed in `src/styles/main.css`; order matters because later rules override earlier ones.
`tokens.css` holds every colour, font and radius as a custom property, including the dark theme.
`layout/responsive.css` comes last and turns the phone layout into a sidebar layout from 900 px.
