# Shock and Awe

A config-driven engine for **interactive scenes** — an executive desk, a planning board, an office environment, a server room. Every scene renders as a native landing page of whichever brand domain serves it, at a slug that can be changed without touching a component.

Standalone Next.js application. **No dependency on `Website_Code_base`** — it can be developed, built and deployed entirely on its own.

- Full specification: `../Shock_and_Awe_Technical_Spec.md`
- Live prototype: the Shock and Awe demo artifact

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional; see Environment below
npm run dev                    # http://localhost:3000
```

`/` lists every live scene route. The first scene is at `/nyc-security-desk`.

| Command | What it does |
|---|---|
| `npm run dev` | Regenerates the reserved-slug list, then starts Next |
| `npm run build` | Same, then a production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:scenes` | Slug collisions, canonical integrity, and full schema validation of dynamic content |

Run `validate:scenes` in CI. It is the guard described under *Reserved slugs* below.

---

## How it fits together

```
Request  →  middleware  →  app/[sceneSlug]/page.tsx  →  <Scene>
             │                    │                        │
      host → brand          source.getByRoute()      layout strategy
      old slug → 301        (brand, slug) → scene     positions items
                                                            │
                                                      SceneModal → viewer
```

Three things resolve independently and never leak into each other:

| Concern | Resolved by | When |
|---|---|---|
| **Brand** | serving host | edge, in middleware |
| **Scene** | `(brand, slug)` via `SceneSource` | build / ISR |
| **Recipient** | `?r=` token | client, after first paint |

Recipient personalisation happening *after* first paint is what lets a scene be both statically cached and individually personalised. Put it in the server render and every recipient needs their own cache entry.

---

## Project layout

```
Shock-and-Awe/
├── app/
│   ├── layout.tsx            brand-resolved metadataBase; analytics slot
│   ├── page.tsx              dev index of live routes (noindex)
│   ├── globals.css           design tokens + --brand-accent
│   └── [sceneSlug]/page.tsx  root catch-all, ISR, canonical + OG
├── middleware.ts             host → brand; old slug → 301
├── components/ui/            Button · Dialog · Skeleton · cn
│                             (API-compatible with the website's common/*)
├── scene/                    ── THE ENGINE ──
│   ├── types.ts              the entire contract
│   ├── sites.ts              brand registry, siteFromHost()
│   ├── track.ts              typed analytics events
│   ├── Scene.tsx             shell: open state, ?open= sync, recipient token
│   ├── SceneStage/…          stage, hotspots, nameplate, banner, mobile list
│   ├── SceneModal.tsx        the single overlay host
│   ├── layouts/              freeform (built) · grid · panorama
│   ├── viewers/              pdf · embed built; rest are Phase 3
│   ├── library/items.ts      shared item definitions
│   ├── configs/              scene records + validation
│   └── source/               SceneSource: static → json → cms
├── scripts/
│   ├── reserved-slugs.mjs    generates the collision guard list
│   └── validate-scenes.mjs   CI check
└── public/scene/
    ├── stages/               background artwork
    └── shared/               documents, video, audio reused across scenes
```

---

## Adding a scene

1. Drop the stage artwork in `public/scene/stages/`.
2. Create `scene/configs/<name>.ts` (copy `nyc-desk.ts`).
3. Register it in `scene/configs/index.ts`.
4. Run `npm run dev` and open `/<your-slug>?edit=1` to see the hotspot boxes while you position them.
5. `npm run validate:scenes` before committing.

### Which props get a hotspot

A prop earns a hotspot when it **carries content** — printed copy, a document, a
screen, a person. Set dressing does not: mugs, pens, plants and staplers stay
decorative however neat a metaphor they would make.

The reason is trust, not tidiness. A visitor who clicks a mug and gets a modal
learns that hotspots on this scene are unpredictable, and stops trying the ones
that matter.

Read the artwork before choosing a `kind`. A tablet showing a player at 02:45 is
a `video`. A cover with a signature on it is a `letter`, not a `pdf`. A button
that says DOWNLOAD BUNDLE is a `download`. Contradicting what the visitor is
looking at is the fastest way to make a scene feel broken.

Reference shared documents by key instead of redefining them:

```ts
items: [
  { ref: 'handbook', placement: { layout: 'freeform', x: 12, y: 60, w: 14, h: 20 } },
]
```

One edit to `scene/library/items.ts` updates every scene on both brands.

---

## Everything is dynamic

Nothing on a scene needs a code change. Documents, links, videos, files and the
scenes themselves all come from data.

### Point at any URL

`kind: "auto"` takes a URL and picks its own viewer at render time:

```json
{ "id": "x", "kind": "auto", "label": "Anything",
  "src": "https://www.youtube.com/watch?v=…" }
```

| You paste | It becomes |
|---|---|
| YouTube, Vimeo, Loom, Wistia, Dailymotion link | video embed (provider URL normalised) |
| `.mp4` `.webm` `.m3u8` | native player with quartile tracking |
| `.mp3` `.wav` `.m4a` | audio player with transcript |
| `.pdf` | inline PDF, searchable and printable |
| `.jpg` `.png` `.webp` `.svg` | image viewer, click to zoom |
| `.docx` `.xlsx` `.pptx` | Microsoft Office viewer when public, download otherwise |
| Google Drive / Docs share link | rewritten to `/preview` and framed |
| Dropbox link | rewritten to `raw=1` |
| `.zip` and other binaries | download |
| anything else | framed if allowlisted, otherwise a redirect |

Resolution happens at render, not at save. A link gains a better viewer as the
resolver improves, with nobody re-editing the content. Set `"as": "embed"` to
override when detection guesses wrong.

### Click behaviour

Clicking an item either opens the modal or navigates — never both. `scene/actions.ts`
decides once, and the hotspot renders the matching element: a `<button>` for the
modal, an `<a>` for anything that navigates. That is what keeps middle-click,
ctrl-click, "copy link address" and the browser status bar working.

| Item | Result |
|---|---|
| `link` | **redirects in the same tab.** Set `"target": "_blank"` per item to opt out |
| `scene` | redirects to the target scene's slug on the current brand |
| `download` | downloads the file; no modal, no navigation |
| `auto` → archive, unknown type | downloads or redirects |
| `auto` / `embed` on a non-allowlisted host | redirects to it in a new tab |
| everything else | opens in the modal |

A same-tab redirect tears the page down immediately, so outbound clicks are sent
with `sendBeacon` — an ordinary request is cancelled mid-flight and the click
never reaches analytics.

### Scenes without a deploy

```bash
SCENE_SOURCE_URL=./content/scenes.json        # a file, re-read on revalidate
SCENE_SOURCE_URL=https://cms/api/scenes       # an API, with SCENE_SOURCE_TOKEN
```

Unset, the app runs from the compiled configs and needs no infrastructure at
all. Set, both sources are read with the dynamic one winning, so scenes migrate
one at a time rather than in a big bang.

Publishing goes live in seconds:

```bash
curl -X POST https://…/api/scene/revalidate \
  -H 'content-type: application/json' \
  -d '{"secret":"…","slugs":["banking-desk"]}'
```

`content/scenes.json` is a worked example — nine items covering every content
type, defined entirely in JSON.

### What replaces the compiler

TypeScript guaranteed config correctness while scenes lived in `.ts` files. The
moment they come from a CMS that guarantee is gone, so `scene/schema.ts` parses
everything at the source boundary:

- **Malformed config** — a bad item is dropped and logged; the rest of the scene
  still serves. A half-finished scene in the CMS should not take a live campaign
  offline.
- **Hostile URLs** — `javascript:` and `data:` hrefs are rejected outright. An
  editable `src` field is an injection surface.
- **Iframe hosts** — an iframe runs third-party code in the visitor's session on
  our origin, so only allowlisted hosts are framed. Anything else degrades to a
  link that opens under its own origin. Extend via `SCENE_EMBED_HOSTS`.

`npm run validate:scenes` runs the same checks in CI against a local content
file. A remote source is validated on every read instead — watch the server log.

---

## Two rules the design depends on

### `id` is immutable, `slug` is not

```ts
{
  id: 'nyc-financial-desk',            // analytics, scene graph, forever
  routes: [
    { site: 'asat',   slug: 'nyc-security-desk', canonical: true },
    { site: 'aspire', slug: 'nyc-desk', indexable: false },
  ],
}
```

Nothing internal references a slug. Rename a URL and historical reports, scene links and the item library all keep working; every previous slug lands in `slugHistory` and middleware 301s it. Campaign links live in sent emails and printed QR codes — they cannot be recalled, so they must keep resolving.

### An unset analytics ID renders no tag

```ts
const { gtmId } = SITES[site];
if (!gtmId) return null;        // never interpolate undefined into a URL
```

`next.config.mjs` fails the production build when a brand's container ID is missing. This is not hypothetical: the live NYC page currently requests `gtm.js?id=undefined` because an unset `NEXT_PUBLIC_*` variable is interpolated straight into the script URL. The tag loads, matches no container, and records nothing — silently.

---

## Reserved slugs

The scene route is a root-level catch-all, so static segments win. A scene slugged `pricing` would silently never render.

`scripts/reserved-slugs.mjs` builds the guard list from two sources:

- every top-level directory in this app's `app/`
- `scene/reserved.extra.json` — routes owned by *another* app on the same domain

That second file is currently seeded with the 25 top-level routes from the main website. **Keep it in sync if this engine ever shares a domain with that site**; if it always runs on its own domain or subdomain, you can empty it.

`validate:scenes` fails the build on a collision, a duplicate slug, a missing parent or scene-link target, or a scene indexable on both brands with no canonical route.

---

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GTM_ASAT` | GTM container for securityawarenesstraining.ai |
| `NEXT_PUBLIC_GTM_ASPIRE` | GTM container for aspiretss.com |
| `NEXT_PUBLIC_FORCE_SITE` | `asat` \| `aspire` — override host resolution locally |
| `SKIP_ENV_CHECK=1` | Allow a production build with no analytics IDs |

On `localhost` the host matches neither brand, so resolution falls back to `DEFAULT_SITE` (`asat`). Use `NEXT_PUBLIC_FORCE_SITE=aspire` to see the other brand without editing your hosts file.

---

## Status

**Built and verified** — `tsc --noEmit` clean, `next build` clean, both routes prerendering.

| Area | State |
|---|---|
| Contract, brand registry, source adapter | Done |
| Freeform layout, stage, hotspots, modal | Done |
| All 14 viewers (`auto`, `pdf`, `pages`, `embed`, `image`, `video`, `audio`, `card`, `letter`, `form`, `link`, `download`, `scene`) | Done |
| Universal media resolver — any URL picks its own viewer | Done |
| Runtime schema validation + URL safety guards | Done |
| Runtime scene source (JSON file or CMS API) + revalidate webhook | Done |
| vCard generation from card config | Done |
| Mobile list view | Done |
| Reserved-slug + dynamic content validation | Done |
| Flipbook page-turn animation | Deferred — `flipbook` renders via `pages` |
| Scene graph breadcrumbs and transitions | Phase 4 |
| Recipient resolution endpoint, CRM alerting | Phase 5 |
| Grid layout (plan boards) | Phase 6 |

---

## Using the engine from the website instead

The `scene/` directory has no imports outside itself and `components/ui/`, which is API-compatible with the website's `components/common/`. To consume it from `Website_Code_base` later, copy `scene/` to `features/scene/`, rewrite `components/ui/*` → `common/*` and `scene/*` → `features/scene/*`, and add the path alias. Publishing it as a private package is the tidier long-term option if both projects need it.
