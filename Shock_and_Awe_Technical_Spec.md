# Shock and Awe — Technical Specification

**Version** 3.0
**Project** `Shock-and-Awe` (standalone Next.js app)
**Stack** Next.js 14 (App Router) · TypeScript · Tailwind · Radix
**Domains** `securityawarenesstraining.ai` · `aspiretss.com`
**Estimate** 28–35 dev days (phased; first demo at ~day 9)

A config-driven engine for interactive scenes — an executive desk, a planning board, an office environment, a server room, or anything else we invent later. Every scene renders as a **native landing page of whichever brand domain serves it**, at a slug that can be changed at any time without a deploy.

> **Changed in v3.0** — v2.0 treated scenes as `noindex` campaign shells on a fixed `/s/[slug]` route. This version makes scenes first-class landing pages on either domain, moves the slug from a build-time constant to editable data with redirect history, and separates a scene's immutable **id** from its mutable **slug**. See [§4.7](#47-what-changed-from-v20) for the delta.

---

## Contents

1. [What we're building](#1-what-were-building)
2. [Two domains, one engine](#2-two-domains-one-engine)
3. [URLs & dynamic slugs](#3-urls--dynamic-slugs)
4. [Key decisions](#4-key-decisions)
5. [Layout strategies](#5-layout-strategies)
6. [Scene graph & navigation](#6-scene-graph--navigation)
7. [Routes & file structure](#7-routes--file-structure)
8. [Data model](#8-data-model)
9. [Item type system](#9-item-type-system)
10. [Shared item library](#10-shared-item-library)
11. [Components](#11-components)
12. [Responsive & accessibility](#12-responsive--accessibility)
13. [Personalisation](#13-personalisation)
14. [Analytics](#14-analytics)
15. [Asset pipeline](#15-asset-pipeline)
16. [SEO & indexing](#16-seo--indexing)
17. [Build phases](#17-build-phases)
18. [Open questions](#18-open-questions)
- [Appendix A — Required refactors](#appendix-a--required-refactors-in-the-existing-codebase)
- [Appendix B — Reference teardown](#appendix-b--reference-implementation-teardown)

---

## 1. What we're building

An engine that renders an **interactive scene**: a visual environment where objects are clickable, and clicking one opens its content in an overlay or navigates to another scene.

Three properties define it:

- **The desk is one scene type, not the abstraction.** Desk, plan board, office, server room, workshop floor — all the same engine.
- **A scene is a landing page.** It carries the serving brand's header, footer, theme, forms, analytics and structured data. A visitor cannot tell it apart from a hand-built page.
- **Its URL is data.** Slugs are editable at runtime, per domain, with automatic redirects from every previous slug.

### Scene types we expect to ship

| Scene | What it is | Layout | Typical use |
|---|---|---|---|
| **Desk** | Overhead executive desk with props | `freeform` | Named-account outreach, ABM |
| **Office** | Room view — whiteboard, shelf, monitor, door | `freeform` | Hub scene that routes into sub-scenes |
| **Plan board** | Kanban / roadmap / programme board | `grid` | Client onboarding plans, 90-day rollouts |
| **Server room / SOC** | Racks, screens, console | `freeform` | Technical-buyer content, SOCaaS |
| **Workshop floor** | Training room, seats, screen | `freeform` | Awareness-programme storytelling |
| **Custom** | Anything with a background and hotspots | `freeform` | Whatever the next campaign needs |

None of these require engine changes. A new scene is a config record plus artwork.

### Anatomy of a scene

```
┌─ Brand chrome — resolved from the serving host ────────────────────┐
│  [ASAT header]                                 securityawareness…  │
├─ SceneStage — layout strategy places every item ───────────────────┤
│   ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│   │  Nameplate   │   │  Item            │   │  Item            │  │
│   │  personalised│   │  kind: video     │   │  kind: card      │  │
│   └──────────────┘   └──────────────────┘   └──────────────────┘  │
│   ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│   │  kind: audio │   │  kind: letter    │   │  kind: scene ────┼──┼─▶ another
│   └──────────────┘   └──────────────────┘   └──────────────────┘  │   scene
│   ┌────────┐ ┌────────┐ ┌────────────┐ ┌────────┐                 │
│   │kind:pdf│ │kind:   │ │kind:       │ │kind:   │                 │
│   │        │ │ pages  │ │  flipbook  │ │  link  │                 │
│   └────────┘ └────────┘ └────────────┘ └────────┘                 │
├────────────────────────────────────────────────────────────────────┤
│  [ASAT footer + JSON-LD + GTM container for this brand]           │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Two domains, one engine

Both brands are served from the same Next.js application. The serving host decides which brand a request belongs to; everything downstream reads that decision.

### Site registry

**`scene/sites.ts`**

```ts
export type SiteKey = 'asat' | 'aspire';

export interface SiteConfig {
  key: SiteKey;
  name: string;
  url: string;
  hosts: string[];               // exact hosts + wildcard subdomain patterns
  logo: string;
  theme: 'asat' | 'aspire';      // Tailwind token set
  gtmId?: string;                // undefined = do not render the tag at all
  ga4Id?: string;
  metaPixelId?: string;
  chatWidgetId?: string;
  formProvider: 'internal' | 'ghl';
  contact: { email: string; phone: string; address: Address };
  social: string[];
}

export const SITES: Record<SiteKey, SiteConfig> = {
  asat: {
    key: 'asat',
    name: 'Aspire Security Awareness Training',
    url: 'https://www.securityawarenesstraining.ai',
    hosts: ['securityawarenesstraining.ai', '*.securityawarenesstraining.ai'],
    logo: '/images/header-aspire-logo.png',
    theme: 'asat',
    gtmId: process.env.NEXT_PUBLIC_GTM_ASAT,
    formProvider: 'internal',
    /* … */
  },
  aspire: {
    key: 'aspire',
    name: 'Aspire Tech Services and Solutions',
    url: 'https://aspiretss.com',
    hosts: ['aspiretss.com', '*.aspiretss.com'],
    logo: '/images/aspire-tss-logo.png',
    theme: 'aspire',
    gtmId: process.env.NEXT_PUBLIC_GTM_ASPIRE,
    formProvider: 'ghl',
    /* … */
  },
};

export function siteFromHost(host: string): SiteKey {
  const h = host.split(':')[0].toLowerCase();
  for (const s of Object.values(SITES)) {
    if (s.hosts.some(p =>
      p.startsWith('*.') ? h === p.slice(2) || h.endsWith(p.slice(1)) : h === p
    )) return s.key;
  }
  return 'asat';                 // safe default for previews and localhost
}
```

### Resolution in middleware

The repo already has a `middleware.ts`. Extend it rather than adding a second one — Next.js allows only one.

```ts
export function middleware(req: NextRequest) {
  // 1. existing legacy case-study redirects — keep as-is

  // 2. resolve brand from host, pass down as a header
  const site = siteFromHost(req.headers.get('host') ?? '');

  // 3. slug-history 301s (see §3)
  const moved = redirectFor(site, req.nextUrl.pathname);
  if (moved) return NextResponse.redirect(new URL(moved, req.url), 301);

  const res = NextResponse.next();
  res.headers.set('x-site', site);
  return res;
}

export const config = { matcher: ['/((?!_next|api|.*\\..*).*)'] };
```

Server components then read it without prop-drilling:

```ts
import { headers } from 'next/headers';
export const currentSite = () =>
  SITES[(headers().get('x-site') as SiteKey) ?? 'asat'];
```

### Subdomains

Wildcard host patterns mean `banking.securityawarenesstraining.ai` resolves to `asat` automatically. The subdomain label itself is captured and passed to the scene as a campaign dimension — useful for attribution, and available as a personalisation token, but **it is not the scene identity**. That was the reference implementation's mistake (see [Appendix B](#appendix-b--reference-implementation-teardown)).

Wildcard subdomains need a wildcard DNS record and a wildcard TLS certificate per apex domain. Confirm the nginx config in `nginx/` supports this before Phase 1 depends on it.

### What varies by brand

| Concern | Mechanism |
|---|---|
| Header / footer | `chrome[site]` component map |
| Colour tokens | `data-brand` attribute on `<html>`, Tailwind token sets |
| Logo, contact, social | `SITES[site]` |
| Analytics container | `SITES[site].gtmId` — omitted entirely when unset |
| Chat widget | `SITES[site].chatWidgetId` |
| Form backend | `SITES[site].formProvider` — `internal` posts to `lib/APIEndpoints.ts`, `ghl` embeds LeadConnector |
| Canonical, JSON-LD, sitemap | `seoFor(site)` — see [Appendix A](#appendix-a--required-refactors-in-the-existing-codebase) |

> **One deployment, not two**
> Serving both brands from one build keeps the engine, the item library and the viewers in a single place. The alternative — two deployments of the same repo with a `SITE` env var — is simpler to reason about but means every scene fix ships twice and the shared item library has to be published as a package. Only choose it if the two brands must be deployed on independent schedules.

---

## 3. URLs & dynamic slugs

Two requirements pull in the same direction: a scene must look like a native landing page, and its slug must be editable without a deploy.

### 3.1 Route shape

| Option | URL | Verdict |
|---|---|---|
| Prefixed | `/s/banking-desk` | Safe, zero collision risk — but reads as a campaign microsite, not a landing page |
| **Root catch-all** | `/banking-desk` | **Recommended.** Indistinguishable from a hand-built page |
| Per-subdomain | `banking.securityawarenesstraining.ai/` | Strongest personalisation feel; DNS and certificate overhead per campaign |

```
app/[sceneSlug]/page.tsx
```

Next.js resolves static segments before dynamic ones, so `/pricing` still hits `app/pricing/page.tsx` and only unmatched paths fall through to the scene route.

> **The collision risk, and the guard**
> The repo already has 25 top-level routes — `pricing`, `products`, `resources`, `compare`, `use-cases`, `company`, `policies`, and the country pages. If someone creates a scene with the slug `pricing`, it will silently never render.
>
> Mitigation: a prebuild script reads the top-level directory names under `app/` and writes them to `scene/reserved.json`. Slug validation rejects any reserved name, and CI fails if a live scene collides. Generating the list from the filesystem rather than hand-maintaining it means it cannot drift when someone adds a new static route.

### 3.2 Identity vs. routing

This is the change that makes dynamic slugs safe.

```ts
export interface SceneConfig {
  id: string;              // IMMUTABLE — analytics, scene graph, library refs
  routes: SceneRoute[];    // MUTABLE — where it is reachable, per brand
  /* … */
}

export interface SceneRoute {
  site: SiteKey;
  slug: string;                  // editable at any time
  slugHistory?: string[];        // every previous slug → 301s automatically
  canonical?: boolean;           // required when live on both brands
  indexable?: boolean;           // default true; false for one-off ABM scenes
  status: 'draft' | 'live' | 'archived';
  publishedAt?: string;
}
```

**Nothing references a slug internally.** The scene graph's `parent` field points at an `id`. Analytics events carry `sceneId`. The item library is keyed by item id. A slug is a routing detail that may change any number of times without breaking history, attribution or navigation.

> **Why this matters**
> The reference implementation used its subdomain as identity, personalisation token and URL simultaneously. That is why its content and its address cannot be changed independently — renaming the campaign means rebuilding the site. Separating `id` from `slug` costs one extra field and removes that whole class of problem.

### 3.3 Redirects on slug change

An editable slug is a liability unless old URLs keep working — campaign links live in sent emails, printed QR codes and LinkedIn posts that cannot be recalled.

When a slug changes, the previous value is pushed onto `slugHistory` automatically. A generated map drives middleware:

```ts
// scene/redirects.generated.ts — emitted at build/publish
export const SLUG_REDIRECTS: Record<SiteKey, Record<string, string>> = {
  asat:   { 'old-banking-desk': 'banking-desk' },
  aspire: { /* … */ },
};
```

301, not 302 — these are permanent moves and we want the search equity to transfer.

### 3.4 Rendering strategy

Dynamic slugs mean the set of valid paths is not fully known at build time.

```ts
// app/[sceneSlug]/page.tsx
export const revalidate = 300;          // ISR: refresh every 5 minutes
export const dynamicParams = true;      // new slugs render on first request

export async function generateStaticParams() {
  const routes = await allLiveRoutes();  // prebuild the known ones
  return routes.map(r => ({ sceneSlug: r.slug }));
}
```

Plus on-demand revalidation so a publish is live in seconds rather than five minutes:

```
app/api/scene/revalidate/route.ts   ← webhook from the config source
```

### 3.5 Where scene config lives

The contract stays typed; only the *source* changes.

```ts
// scene/source/index.ts
export interface SceneSource {
  getByRoute(site: SiteKey, slug: string): Promise<ResolvedScene | null>;
  getById(id: string): Promise<ResolvedScene | null>;
  allLiveRoutes(): Promise<SceneRoute[]>;
}
```

| Phase | Adapter | Slug changes require |
|---|---|---|
| v1 | `staticSource` — typed TS files in `configs/` | A deploy |
| v2 | `jsonSource` — JSON in the repo, ISR | A commit, no rebuild of components |
| v3 | `cmsSource` — CMS or database + webhook | Nothing; live in seconds |

Build against the interface from day one and the migration is a one-line swap in a factory. Ship `staticSource` in Phase 1 so scene work is not blocked on choosing a CMS, but treat `cmsSource` as the real destination — "set the slug dynamically" is not truly satisfied until a marketer can do it without engineering.

---

## 4. Key decisions

### 4.1 Host resolves brand, brand resolves everything else

One decision at the edge — which brand is this? — cascades into chrome, theme, analytics, forms and SEO. No component takes a `site` prop; they read it from context seeded by middleware.

### 4.2 Layout is a strategy, not a hardcode

A scene declares `layout: 'freeform' | 'grid' | 'panorama'`. The stage resolves that to a positioning strategy. Item definitions, viewers, analytics and personalisation are entirely independent of layout — a PDF behaves identically whether it sits on a desk or in a board column. This is what stops "add a plan board" from becoming a second codebase.

### 4.3 Percentage hotspots, not an image map

The reference desk uses an HTML `<area>` image map with pixel coordinates locked to a 1240 px background. That is why it is effectively desktop-only. Freeform scenes position hotspots as absolutely-placed `<button>` elements using *percentage* offsets inside an `aspect-ratio` container.

> **Why it matters**
> Real buttons also give us keyboard focus, hover affordances, ARIA labels and analytics handlers for free. Image-map `<area>` elements give us none of that.

### 4.4 Discriminated union for item types

Each item carries a `kind` discriminator. A registry maps `kind` to a lazily-loaded viewer. Adding a content type means adding one union member and one component — no changes to the stage, the source adapter or any existing viewer.

### 4.5 `kind: 'scene'` makes the system recursive

Navigation between scenes is not new machinery. It is one more item kind, targeting a scene **id**; the router resolves that id to the current brand's slug at render time.

### 4.6 One modal shell, many viewers

A single `SceneModal` on the Radix Dialog already in `package.json` owns all overlay chrome — title, download affordance, close, focus trap, escape, scroll lock.

### 4.7 What changed from v2.0

| v2.0 | v3.0 |
|---|---|
| Single domain assumed | Two brands resolved from the serving host |
| `/s/[slug]` prefix | Root-level `/[sceneSlug]` with reserved-slug guard |
| `noindex` campaign shells | Indexable landing pages by default, `noindex` per route |
| No site chrome | Brand header, footer, theme, chat widget |
| `slug` was the identity | Immutable `id` + mutable `routes[].slug` + redirect history |
| Build-time TS registry only | `SceneSource` interface; static → JSON → CMS |
| SSG only | SSG + ISR + on-demand revalidation |
| 22–28 dev days | 28–35 dev days |

### 4.8 Prefer live embeds over snapshots

The reference desk's main brochure is a flipbook snapshot of a landing page. It has since drifted: it quotes a different salary range and review count than the live page, and still carries a third-party vendor's branding on its certificate mockup. For anything that changes, use `kind: 'embed'`.

---

## 5. Layout strategies

A layout strategy answers one question: *given a placement, where does this item go on screen?*

| Strategy | Placement shape | Artwork | Best for |
|---|---|---|---|
| `freeform` | `{ x, y, w, h, rotate }` as % of stage | One high-res render | Desk, office, server room, workshop — anything photoreal |
| `grid` | `{ col, row, span }` | None — CSS-drawn | Plan board, kanban, roadmap, resource library |
| `panorama` | `{ yaw, pitch, size }` | 360° equirectangular | Walkthrough office environments |

```ts
export type Placement =
  | { layout: 'freeform'; x: number; y: number; w: number; h: number;
      rotate?: number; shape?: 'rect' | 'ellipse' }
  | { layout: 'grid'; col: number; row: number; colSpan?: number; rowSpan?: number }
  | { layout: 'panorama'; yaw: number; pitch: number; size: number };
```

A `LayoutStrategy` supplies three things: a stage wrapper, a per-item positioner returning style props, and a mobile fallback renderer. Nothing else in the engine knows which layout is active.

> **Sequencing recommendation**
> Ship `freeform` first — it covers desk, office, server room, workshop floor and any future photoreal environment, which is most of the roadmap. Add `grid` when a plan board is actually commissioned. Treat `panorama` as out of scope until someone asks: it needs a 3D library, 360° capture and its own accessibility story.

### Grid layout notes

A plan board is structurally different from a desk: items are content-bearing cards, not props on a photograph. The `grid` strategy renders each item as a visible card — the hotspot *is* the card. Columns come from the config, and the mobile fallback is simply to stack them. Freeform needs a purpose-built list view; grid does not.

---

## 6. Scene graph & navigation

Scenes form a tree. An office contains a desk and a whiteboard; the desk contains documents.

```ts
{ id: 'nyc-office', parent: undefined, … }     // root
{ id: 'nyc-desk',   parent: 'nyc-office', … }  // child — references the ID
```

Breadcrumbs derive from the tree; slugs are resolved per brand at render time, so the same graph works on both domains with different URLs.

```ts
export interface SceneLinkItem extends SceneItemBase {
  kind: 'scene';
  targetId: string;              // scene id, never a slug
  transition?: 'zoom' | 'fade' | 'push';
  preview?: string;
}
```

Clicking is a real Next.js route change, so back-button support, shareable deep links and prefetching come free. The `zoom` transition uses the View Transitions API where available, falls back to a cross-fade, and is suppressed under `prefers-reduced-motion`.

> **Keep the tree shallow**
> Two levels is the sweet spot. Three starts to feel like a maze and recipients abandon before reaching the content. Prefetch every child scene on hover so transitions feel instant.

**Guaranteed exits.** Every non-root scene renders a persistent breadcrumb and an "up" affordance, and every scene keeps the banner CTA visible. A visitor must never be more than one click from the conversion path.

---

## 7. Routes & file structure

### Routes

| Path | Type | Purpose |
|---|---|---|
| `app/[sceneSlug]/page.tsx` | ISR | Renders one scene for the resolved brand |
| `app/api/scene/revalidate/route.ts` | Handler | Publish webhook → on-demand revalidation |
| `app/api/scene/vcard/[id]/route.ts` | Handler | Generates `.vcf` from card config |
| `app/api/scene/track/route.ts` | Handler | Server beacon for recipient attribution |
| `middleware.ts` | Edge | Host → brand, slug-history 301s |

### Project layout

Shock and Awe is its own Next.js application, deployed independently of the
main website. Nothing in `scene/` imports outside itself and `components/ui/`.

```
Shock-and-Awe/
├── app/
│   ├── layout.tsx            brand-resolved metadataBase, analytics slot
│   ├── page.tsx              dev index of live routes (noindex)
│   ├── globals.css           design tokens + --brand-accent
│   └── [sceneSlug]/page.tsx  root catch-all, ISR, canonical + OG
├── middleware.ts
├── components/ui/            Button · Dialog · Skeleton · cn
│                             (API-compatible with the website's common/*)
├── scripts/                  reserved-slugs.mjs · validate-scenes.mjs
├── public/scene/             stages/ · shared/
└── scene/                    ── the engine ──
```

### The engine

```
scene/
├── types.ts                  // the whole contract
├── sites.ts                  // SiteConfig registry + siteFromHost()
├── reserved.json             // GENERATED from app/ top-level dirs
├── redirects.generated.ts    // GENERATED from slugHistory
├── source/
│   ├── index.ts              // SceneSource interface + factory
│   ├── staticSource.ts       // v1 — typed TS configs
│   └── cmsSource.ts          // v3 — CMS/DB adapter
├── configs/                  // v1 scene records
├── library/items.ts          // shared item definitions
├── layouts/
│   ├── registry.ts  FreeformLayout.tsx  GridLayout.tsx  types.ts
├── chrome/
│   ├── AsatChrome.tsx  AspireChrome.tsx  index.ts
├── Scene.tsx                 // stage + item layer + modal host
├── SceneStage.tsx            // resolves layout strategy
├── SceneItemButton.tsx       // one accessible hotspot / card
├── SceneNameplate.tsx  SceneBanner.tsx  SceneBreadcrumb.tsx
├── SceneModal.tsx            // Radix Dialog shell
├── SceneMobileList.tsx       // fallback for freeform under md
├── useSceneItem.ts           // open/close + ?open= deep-link sync
├── track.ts                  // typed analytics events
└── viewers/
    ├── registry.ts
    ├── PdfViewer.tsx     PagesViewer.tsx    FlipbookViewer.tsx
    ├── EmbedViewer.tsx   VideoViewer.tsx    AudioViewer.tsx
    └── CardViewer.tsx    LetterViewer.tsx   FormViewer.tsx
```

Path aliases `scene/*` and `components/*` are already configured in `tsconfig.json`.

### Public assets

```
public/scene/
├── stages/
│   ├── walnut-desk.webp             // 2400×1400, ~180KB
│   ├── slate-office.webp
│   └── soc-console.webp
└── shared/                          // reused across scenes AND brands
    ├── docs/handbook.pdf
    ├── pages/handbook/p-01.webp … + thumbs/
    ├── video/intro.mp4 · intro.vtt · poster.webp
    └── audio/message.mp3 · message.txt
```

---

## 8. Data model

```ts
export type LayoutKind = 'freeform' | 'grid' | 'panorama';
export type ScenePreset = 'desk' | 'office' | 'board' | 'soc' | 'workshop' | 'custom';

export interface SceneConfig {
  id: string;                        // IMMUTABLE identity
  routes: SceneRoute[];              // MUTABLE addresses, one per brand
  parent?: string;                   // parent scene ID, for breadcrumbs

  preset: ScenePreset;               // semantic — supplies defaults
  layout: LayoutKind;                // mechanical — selects the strategy

  audience: {
    nameplate: string;               // "Financial Services Leaders"
    prefix?: string;                 // "Customized for the Desk of"
  };

  stage: {
    background?: { src: string; width: number; height: number; alt: string };
    columns?: { id: string; label: string }[];        // grid only
    theme?: 'walnut' | 'slate' | 'light' | 'dark';
  };

  chrome?: 'full' | 'minimal' | 'none';   // header/footer treatment
  banner?: { text: string; cta: { label: string; href: string } };
  autoOpen?: string;                 // item id opened on load

  items: Placed[];

  seo: {
    title: string;
    description: string;
    ogImage?: string;
    schema?: 'WebPage' | 'Course' | 'Product' | 'CollectionPage';
  };
  tracking?: { campaign: string; source?: string };
}
```

Note `seo` is now a first-class concern rather than a `noindex` flag — scenes are landing pages and must carry proper metadata per brand.

> **Migration path**
> Configs start as typed TS files behind the `SceneSource` interface — compile-time safety, zero infrastructure, reviewable in a pull request. Swapping to a CMS touches one factory function, because every component consumes `SceneConfig` and nothing else.

**Authoring aid.** Ship a dev-only overlay (`?edit=1`) that draws each placement with its live coordinates and lets you drag to reposition, then copies the updated config to the clipboard. For `freeform` this is essential — hand-tuning percentages by trial and error will otherwise eat a day per scene.

---

## 9. Item type system

```ts
interface SceneItemBase {
  id: string;              // stable — analytics + ?open= deep links
  kind: SceneItemKind;
  label: string;           // accessible name + modal title
  hint?: string;           // hover tooltip
  gated?: GateConfig;      // optional lead capture before viewing
  download?: DownloadConfig; // ANY kind can also be downloadable
}

/** An item definition plus where it sits in this particular scene. */
export type Placed =
  | { ref: string;  placement: Placement }        // from the shared library
  | (SceneItem & { placement: Placement });       // inline, one-off
```

`placement` is deliberately separate from the item definition — that is what lets the same handbook sit at different coordinates in three different scenes.

> **Answering the brief directly**
> You asked for PDF, images, downloadable links, and room to grow. `download` sits on the *base*, not on one kind — so a PDF, a page-image set, a video or a live embed can each carry a download affordance. The modal renders that button automatically whenever the field is present.

### Kinds shipped in v1

| kind | Payload | Behaviour |
|---|---|---|
| `pdf` | `src`, `initialPage?` | Native browser PDF embed. Searchable, zero prep. |
| `pages` | `pages[]`, `layout` | Rendered page images, scroll or spread, thumbnail rail. |
| `flipbook` | `pages[]`, `cover` | Page-turn animation. The showpiece; heaviest prep. |
| `embed` | `src`, `sandbox?` | Live HTML in a sandboxed iframe. Never goes stale. |
| `scene` | `targetId`, `transition?` | **Navigates to another scene.** No modal. |
| `link` | `href`, `target` | No modal — navigates straight out. |
| `download` | `download` (required) | No modal — triggers the file, fires the event. |
| `video` | `src`/`youtubeId`, `poster`, `captions` | Muted in-frame; click promotes to modal with sound. |
| `audio` | `src`, `transcript` | Player with visible transcript. |
| `card` | `person`, `social[]`, `vcard` | Contact card with social links and vCard download. |
| `letter` | `bodyMdx`, `signature` | Letterhead + rich text, `{{firstName}}` tokens. |
| `form` | `provider?`, `formId` | Lead form; defaults to the brand's `formProvider`. |

```ts
import dynamic from 'next/dynamic';

// Lazy — flipbook and PDF code never enter the initial bundle.
export const VIEWERS: Record<SceneItemKind, ViewerComponent> = {
  pdf:      dynamic(() => import('./PdfViewer')),
  pages:    dynamic(() => import('./PagesViewer')),
  flipbook: dynamic(() => import('./FlipbookViewer')),
  embed:    dynamic(() => import('./EmbedViewer')),
  video:    dynamic(() => import('./VideoViewer')),
  audio:    dynamic(() => import('./AudioViewer')),
  card:     dynamic(() => import('./CardViewer')),
  letter:   dynamic(() => import('./LetterViewer')),
  form:     dynamic(() => import('./FormViewer')),
  scene:    NoModal,   // navigates instead
  link:     NoModal,
  download: NoModal,
};
```

> **Adding a 13th type later**
> Add `'calendar'` to the union, write `CalendarViewer.tsx`, add one line to the registry. TypeScript's exhaustiveness checking on `Record<SceneItemKind, …>` fails the build until the registry entry exists — so it is impossible to ship a half-wired type.

---

## 10. Shared item library

With multiple scenes across two brands, the same handbook appears on the desk, pinned to the board and on the office shelf. Defining it repeatedly guarantees the copies drift apart.

```ts
export const LIBRARY = {
  handbook: {
    id: 'handbook',
    kind: 'pages',
    label: 'Cyber Security Awareness Handbook',
    hint: 'Read the handbook',
    pages: HANDBOOK_PAGES,
    download: { href: '/scene/shared/docs/handbook.pdf', sizeLabel: '6.2 MB' },
  },
  socBrochure: {
    id: 'soc-brochure',
    kind: 'pdf',
    label: 'Aspire SOC-as-a-Service',
    src: '/scene/shared/docs/a-soc.pdf',
  },
} satisfies Record<string, SceneItem>;
```

Used in a scene:

```ts
items: [
  { ref: 'handbook',    placement: { layout: 'freeform', x: 12, y: 60, w: 14, h: 20, rotate: -6 } },
  { ref: 'socBrochure', placement: { layout: 'freeform', x: 62, y: 44, w: 16, h: 26 } },

  // inline, one-off — never reused
  {
    id: 'nyc-letter', kind: 'letter', label: 'A note from Adam',
    bodyMdx: '…', signature: { name: 'Adam Tanjil', title: 'CEO' },
    placement: { layout: 'freeform', x: 34, y: 40, w: 22, h: 40 },
  },
],
```

`resolvePlaced()` merges `LIBRARY[ref]` with the placement at build time. Scenes may override individual fields without forking the definition. **Update the handbook once and every scene on both brands updates.**

---

## 11. Components

```tsx
<Scene config={config} site={site} recipient={recipient}>
  <BrandChrome position="header" />   // resolved from SITES[site]
  <SceneBanner />
  <SceneBreadcrumb />                 // only when config.parent exists
  <SceneStage layout={config.layout}>
    <SceneNameplate />
    {items.map(i => <SceneItemButton key={i.id} item={i} />)}
  </SceneStage>
  <SceneMobileList />                 // freeform fallback under md
  <SceneModal>
    <Viewer item={activeItem} />      // resolved from VIEWERS[kind]
  </SceneModal>
  <BrandChrome position="footer" />
</Scene>
```

`SceneStage` looks up `LAYOUTS[layout]` and delegates. `SceneItemButton` asks the active strategy for its style props — it never branches on layout itself.

### SceneItemButton (freeform strategy)

```tsx
<button
  type="button"
  aria-label={`${item.label}, ${KIND_LABEL[item.kind]}`}
  title={item.hint}
  onClick={() => activate(item)}      // opens modal OR navigates
  style={strategy.position(item.placement)}
  className="absolute rounded-sm transition duration-150
             hover:ring-2 hover:ring-[var(--brand-accent)] hover:brightness-110
             focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]
             focus-visible:outline-none"
/>
```

Note the accent is a CSS custom property, not a literal — that is what lets one component serve two brands.

### SceneModal responsibilities

- Radix `Dialog` — focus trap, escape to close, scroll lock, `aria-modal`
- Header: item label, optional download button, close
- Suspense boundary with a skeleton while the lazy viewer loads
- Syncs `?open=<itemId>` into the URL so a document is shareable and back-button-closable
- Emits `scene_item_open` on mount and `scene_item_close` with dwell time on unmount

### Reuse from the existing repo

| Need | Already available |
|---|---|
| Modal shell | `components/common/Dialog.tsx` (Radix) |
| Thumbnail rail / carousel | `components/common/Carousel.tsx` (embla) |
| Grid layout cards | `components/common/Card.tsx` |
| Breadcrumbs | `components/common/Breadcrumb.tsx` |
| Lead form validation | `react-hook-form` + `zod` + `schemas/` |
| Phone input | `components/common/CustomPhoneInput.tsx` |
| Toasts · Icons | `react-toastify` · `lucide-react` |
| PDF-preview precedent | `features/newsletter/PreviewModal.tsx` |
| Chat widget | `components/chatWidget.tsx` (needs brand-keying) |

Almost nothing new needs to enter `package.json`. The one likely addition is a page-turn library if you ship `kind: 'flipbook'`.

---

## 12. Responsive & accessibility

| Width | `freeform` | `grid` |
|---|---|---|
| `≥ 1024px` | Full scene, all hotspots, hover states | Full column board |
| `768–1023px` | Scene scaled; 44 px minimum tap targets | Columns scroll horizontally |
| `< 768px` | `SceneMobileList` — vertical card list with thumbnail, label, kind badge | Columns stack vertically |

Same viewers, same analytics, same item definitions in every case. On mobile, freeform scenes skip the background image download entirely.

> **Do not skip this**
> A scaled-down desk on a 390 px phone gives you 20 px tap targets on top of each other. The list view is not a degraded fallback — for most visitors it will be the primary experience. It also matters more now that scenes are indexable: Google evaluates the mobile rendering.

### Accessibility requirements

- Hotspots are real buttons in a sensible DOM order, independent of visual position
- Visible focus ring on every item; scenes are fully keyboard-navigable
- `kind: 'audio'` requires a `transcript`; `kind: 'video'` requires `captions` — enforce in the type, not by convention
- `kind: 'scene'` items announce their destination in the accessible name
- Page images carry meaningful `alt`; scanned documents also expose the source PDF
- `prefers-reduced-motion` disables page-turn animation and scene transitions

### Performance budget

- Stage background: AVIF/WebP via `next/image` with `priority`, under 200 KB at 2400 px
- Initial JS: scene shell only — every viewer *and* every layout strategy is `next/dynamic`
- Child scenes prefetched on hover over a `kind: 'scene'` item
- Target LCP under 2.0s on 4G — now a ranking factor, since scenes are indexable

---

## 13. Personalisation

Three layers, each independent.

| Layer | Source | Resolved |
|---|---|---|
| **Brand** | Serving host | Edge, in middleware |
| **Audience** | `config.audience.nameplate` | Build time, baked into the scene |
| **Recipient** | `?r=<token>` | Runtime, client-side after first paint |

```ts
// https://securityawarenesstraining.ai/banking-desk?r=a7f3c9

// 1. Opaque token, never PII in the URL
// 2. Client resolves it once against /api/scene/track
// 3. Response personalises nameplate + letter tokens
// 4. The token survives navigation across the scene graph — and across brands

type Recipient = {
  id: string;
  firstName?: string;
  company?: string;
  owner?: string;        // sales rep, for routing the alert
};
```

> **Privacy**
> Never put a name, email or company in the query string. Scene links get forwarded, pasted into Slack and logged by every proxy in between. An opaque token that resolves server-side keeps the personalisation without leaking the list.

Because recipient personalisation happens after first paint, it does not fragment the ISR cache — the same static HTML serves everyone and personalises client-side. That is what makes indexable landing pages and per-recipient personalisation compatible.

---

## 14. Analytics

> **Root cause found**
> The `undefined` container IDs I observed on the live NYC page come from **unset `NEXT_PUBLIC_*` environment variables being interpolated straight into script URLs with no guard.** In `app/layout.tsx` of this repo, GTM is hardcoded (`GTM-ML7KVR4N`, works) while the gtag block builds its URL from `${process.env.NEXT_PUBLIC_GA_ID}` — which produces `gtag/js?id=undefined` wherever that variable is missing.
>
> **Fix:** never interpolate an unset ID. Render the tag conditionally, and fail the production build if a brand's ID is absent.
>
> ```ts
> const { gtmId } = SITES[site];
> if (!gtmId) return null;            // no tag rather than a broken tag
> ```
> ```ts
> // next.config.mjs or a prebuild check
> if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_GTM_ASAT)
>   throw new Error('NEXT_PUBLIC_GTM_ASAT is required for production builds');
> ```
> Multi-domain makes this sharper: two brands, two containers, twice the chance of a silent miss.

**`scene/track.ts`**

```ts
export type SceneEvent =
  | { event: 'scene_view';           sceneId: string; site: SiteKey; preset: ScenePreset }
  | { event: 'scene_navigate';       from: string; to: string }        // scene IDs
  | { event: 'scene_item_open';      sceneId: string; itemId: string; kind: SceneItemKind }
  | { event: 'scene_item_close';     sceneId: string; itemId: string; dwellMs: number }
  | { event: 'scene_page_turn';      sceneId: string; itemId: string; page: number }
  | { event: 'scene_media_progress'; sceneId: string; itemId: string; pct: 25|50|75|100 }
  | { event: 'scene_download';       sceneId: string; itemId: string }
  | { event: 'scene_cta_click';      sceneId: string; href: string; itemId?: string }
  | { event: 'scene_lead_submit';    sceneId: string; itemId: string; formId: string };

export function track(e: SceneEvent) {
  window.dataLayer?.push({ ...e, recipient: getRecipientId() });
  if (isHighIntent(e)) beacon('/api/scene/track', e);   // CRM alert
}
```

Events carry `sceneId`, never a slug — so renaming a URL does not fracture a historical report. Three questions answered without further instrumentation: *which item earns the most attention*, *which route through the graph converts*, and *which brand performs better for the same content*.

---

## 15. Asset pipeline

**`scripts/scene-pages.sh`**

```bash
#!/usr/bin/env bash
# usage: ./scene-pages.sh guide.pdf public/scene/shared/pages/guide
set -euo pipefail
IN="$1"; OUT="$2"
mkdir -p "$OUT/thumbs"

pdftoppm -r 150 -png "$IN" "$OUT/p"

for f in "$OUT"/p-*.png; do
  base=$(basename "$f" .png)
  npx sharp -i "$f" -o "$OUT/$base.webp"        resize 1600 --withoutEnlargement
  npx sharp -i "$f" -o "$OUT/thumbs/$base.webp" resize 220
  rm "$f"
done

node scripts/emit-pages-config.mjs "$OUT"   # emits pages[] for library/items.ts
```

You already have a partial precedent in `Handbook_Page_Renders/`.

### Which format for which document

| Document | Use | Why |
|---|---|---|
| Long text reports, whitepapers | `pdf` | Searchable, accessible, zero prep, prints correctly |
| Design-heavy brochures, handbooks | `pages` | Renders faithfully, mobile-friendly, no flip library |
| The one hero document per campaign | `flipbook` | The wow moment — spend the asset budget here only |
| Anything that changes | `embed` | Cannot drift out of date |
| Templates, checklists, tools | `download` | The point is to take it away |

> **Budget reality**
> A 28-page flipbook is roughly 56 rendered images plus thumbnails. Rendering is automated; *checking* them is not. Assume half a day of QA per flipbook.

### Stage artwork

Each freeform scene needs one high-resolution render with clearly separated props and empty surfaces where content will sit. Props must map to sensible hotspot rectangles — a brochure lying at a 40° angle is hard to hit.

**Commission in matched sets**, and now also **per brand**: an ASAT scene and an Aspire Tech scene should each carry their own palette and brand cues, while scenes within one graph must be visually consistent with each other. `grid` scenes need no artwork at all — worth remembering when a campaign is on a deadline.

---

## 16. SEO & indexing

Scenes are landing pages now, so this section inverts from v2.0: **indexable by default**, with `noindex` reserved for one-off ABM or PURL scenes.

### Per-route control

```ts
routes: [
  { site: 'asat',   slug: 'banking-security-desk', canonical: true, indexable: true,  status: 'live' },
  { site: 'aspire', slug: 'banking-desk',                            indexable: false, status: 'live' },
]
```

### Requirements

- **Canonical** points at the `canonical: true` route's absolute URL on its own domain
- **`metadataBase`** resolves per brand, not from a module constant
- **JSON-LD** from `seoFor(site)` plus a per-scene `WebPage` / `Course` / `Product` node
- **`og:image`** per scene — the reference NYC page has none, so its shared links render bare
- **One `<h1>`** per scene, and it is the nameplate or scene title. The reference page has thirteen.
- **Sitemap** per host, generated from `allLiveRoutes()` filtered to `indexable && canonical`

> **Cross-domain duplicate content**
> The same scene live and indexable on both domains competes with itself in search and splits its own link equity. Exactly one route must carry `canonical: true`; the other points its canonical tag at the first. Enforce this in `validateTree()` so CI catches it rather than Search Console three months later.

> **Content already indexed elsewhere**
> Where a scene wraps a document that also lives at `/resources/*`, decide which URL should rank and point the other's canonical at it. Two indexable pages carrying the same handbook is the same problem in a different shape.

---

## 17. Build phases

Estimates assume one mid-level Next.js developer already familiar with this codebase.

### Phase 0 · Multi-domain foundations — 5–6 days

- Extend `middleware.ts`: host → brand resolution, `x-site` header, preserve existing redirects
- `sites.ts` registry; `currentSite()` helper
- **Refactor `lib/seo.ts` to `seoFor(site)`** — see [Appendix A](#appendix-a--required-refactors-in-the-existing-codebase); do this before scene work builds on it
- Brand-key `app/layout.tsx` (`metadataBase`, GTM, chat widget) and `app/sitemap.ts`
- Guard every analytics tag against unset env vars; add the production build assertion
- Brand token sets + `BrandChrome` component map
- Confirm wildcard DNS/TLS in `nginx/` if subdomains are in scope

### Phase 1 · Scene contract & routing — 4–5 days

- Write `types.ts` in full — the contract, agreed before any UI
- `SceneSource` interface + `staticSource`; `resolvePlaced()`; item library
- `app/[sceneSlug]/page.tsx` with ISR, `generateStaticParams`, `dynamicParams`
- Reserved-slug generator + CI validation; `validateTree()`
- `slugHistory` → `redirects.generated.ts` → middleware 301s
- **Milestone:** an empty scene renders on both domains at editable slugs

### Phase 2 · Freeform stage & core viewers — 4–5 days

- `FreeformLayout`, `SceneStage`, `SceneItemButton`, `SceneNameplate`, `SceneBanner`
- `SceneModal` on Radix Dialog + viewer registry + Suspense
- Viewers: `pdf`, `embed`, `link`, `download`
- Item authoring overlay (`?edit=1`)
- **Milestone:** a clickable desk with real documents, demoable internally

### Phase 3 · Rich viewers & mobile — 4–5 days

- Viewers: `pages`, `video`, `audio`, `card` (+ vCard route), `letter`, `form`
- `form` viewer resolving `internal` vs `ghl` from the brand
- `SceneMobileList` and the breakpoint switch
- Asset pipeline script + first document conversion
- Accessibility pass: keyboard, focus, captions, transcripts, reduced motion

### Phase 4 · Scene graph & SEO — 4–5 days

- `kind: 'scene'` item, `SceneBreadcrumb`, transitions, prefetch-on-hover
- Per-scene metadata, canonical resolution, JSON-LD, `og:image`
- Sitemap entries from `allLiveRoutes()`; cross-domain canonical validation
- Build an office scene that routes into the Phase 2 desk
- **Milestone:** a two-level environment, indexable, live on both brands

### Phase 5 · Personalisation & measurement — 3–4 days

- `track.ts`, dataLayer events, both GTM containers validated in staging
- Recipient token surviving graph and brand navigation; `/api/scene/track`; CRM alerting
- `?open=` deep links and back-button handling
- Optional lead gating on selected items

### Phase 6 · Dynamic source & grid layout — 4–5 days

- `cmsSource` adapter + `/api/scene/revalidate` webhook — **slugs editable without a deploy**
- `GridLayout` strategy + column config + card rendering; build a plan board from config
- `FlipbookViewer` with page-turn animation and reduced-motion fallback
- Authoring documentation for the marketing team

**Total: 28–35 dev days**, roughly six to seven weeks for one developer, excluding stage artwork production and document QA.

> **If the timeline is tight**
> Phase 0 is not optional — the multi-domain refactor is foundational and retrofitting it later means touching every component built on top. Phases 0–3 (13–16 days) deliver working scenes on both brands with static slugs. Phase 6 is what makes slugs truly *dynamic*; until then a slug change is a one-line commit and a deploy, which may be acceptable for the first few campaigns.
>
> **Do not defer Phase 5.** Shipping campaigns you cannot measure is how the current NYC page ended up with broken analytics nobody noticed.

---

## 18. Open questions

1. **One deployment or two?**
   Serving both brands from a single build is the assumption throughout this spec. If the two sites must deploy on independent schedules — different release cadences, different approval chains — say so now; it changes the shared-library strategy from an import to a published package.

2. **Are campaign subdomains in scope?**
   `banking.securityawarenesstraining.ai` needs wildcard DNS and a wildcard TLS certificate per apex domain. The `nginx/` config in the repo needs checking. If subdomains are only ever cosmetic, root-level slugs on the apex domain are simpler and ship sooner.

3. **Which CMS backs the dynamic slugs?**
   "Set the slug dynamically" is only fully satisfied when a marketer can change a URL without engineering. That needs a config source with an editing UI. Options range from a headless CMS to a small internal admin screen over a database table. The `SceneSource` interface keeps this decision deferrable, but not indefinitely.

4. **How does Shock and Awe reach each domain in production?**
   It is a separate deployment, so both brands need to route to it. Either give it
   its own subdomain per brand (`scenes.securityawarenesstraining.ai`), or put a
   reverse-proxy rule in front of each site that forwards unmatched paths to this
   app. The second option is what makes scenes look like native pages of the main
   site — and it is the case where `scene/reserved.extra.json` has to stay in sync
   with that site's routes.

5. **Who produces the stage artwork?**
   On the critical path for Phase 2, and not a developer task. Each freeform scene needs one high-resolution render with well-separated props; scenes in the same graph must be visually consistent, and the two brands need distinct visual identities.

---

## Appendix A — Refactors the website needs *if* the two ever merge

**These do not apply while Shock and Awe runs as its own application.** It already
resolves brand from host, gates analytics on a defined container ID, and owns its
own `metadataBase` and middleware.

Keep this list for one scenario only: folding the engine back into
`Website_Code_base`, or serving both from one deployment. Every file below is
single-brand today and would have to become brand-aware first — and doing it
*after* scenes are built means revisiting every scene component.

| File (website repo) | Currently | Needs to become |
|---|---|---|
| `lib/seo.ts` | Module constants `SITE_NAME`, `SITE_URL`, `SITE_LOGO`, `CONTACT`, `organizationSchema`, `siteJsonLdGraph` hardcoded to securityawarenesstraining.ai | `seoFor(site: SiteKey)` returning the same shape. Touches every importer, so do it first. |
| `app/layout.tsx` | `metadataBase: new URL(SITE_URL)`; GTM hardcoded to `GTM-ML7KVR4N`; gtag URL built from an unset `NEXT_PUBLIC_GA_ID` | Brand-resolved `metadataBase`; container IDs from `SITES[site]`; **conditional render when an ID is missing** |
| `app/sitemap.ts` | `BASE_URL` hardcoded; hand-maintained `staticRoutes` array | Host-aware base URL; merge static routes with `allLiveRoutes()` filtered to indexable + canonical |
| `components/chatWidget.tsx` | `data-widget-id` hardcoded to a single GHL widget | Widget ID from `SITES[site].chatWidgetId`; render nothing when unset |
| `middleware.ts` | Matcher scoped to `/resources/case-studies/:path*` | Broadened matcher; host → brand resolution; slug-history 301s; existing case-study redirects preserved |
| `components/StructuredData.tsx` | Emits the constant `siteJsonLdGraph` | Emits `seoFor(site).jsonLdGraph` |

One item here is worth acting on **regardless of whether the two ever merge**:
`app/layout.tsx` builds its gtag URL from an unset `NEXT_PUBLIC_GA_ID`, which is
why the live NYC page requests `gtag/js?id=undefined` and records nothing. That
bug is live on the website today and is independent of this project.

---

## Appendix B — Reference implementation teardown

What the pleasereview.info desk does, for comparison.

### Hotspots (10 total)

| Object | Hotspot ID | Behaviour |
|---|---|---|
| Top banner CTA | link | → `aspiretss.com/cybersecurity-certification-new-york` |
| Tablet | `Video` | Autoplays muted with overlay; click restarts with audio (2:16) |
| Phone | `AudioLink` | Hidden 0:53 audio message; only a thin control bar appears |
| Business card | `BusinessCard` | Contact details, QR codes, social links, vCard download |
| Letter | `Letter` | Scrollable sales letter |
| Blue brochure | `RightBook` | 12-page flipbook of the landing page |
| Red guide | `LeftReport` | 28-page IT buyer's guide |
| Folder docs 1–4 | `Folder1–4` | Education guide, newsletter, SOC brochure, handbook |

### Its entire config object

```js
LoadData = {
  FlipIntegration: true,
  SubDomain: "in-nyc-cyber-security-professionals",
  AutoPlayItem: "Video",
  Brochure: { Brochure1, Brochure2, Brochure3, Brochure4 },
  Document: { PrimaryBook, FreeReport },
  LetterText, LetterLogoURI
}
```

All documents render through one iframe endpoint, `/flip/?ShowWhat=<slot>`. Overlays are pre-built hidden divs toggled on click.

> **Two ceilings worth naming**
>
> **Fixed slots.** `Brochure1–4`, `PrimaryBook`, `FreeReport`. The engine cannot hold five brochures, and it cannot hold anything that is not a brochure. Our `items[]` array with a `kind` discriminator exists precisely to avoid that.
>
> **Subdomain as identity.** `SubDomain` is simultaneously the URL, the personalisation token and the scene's identity. Renaming the campaign means rebuilding the site, and there is no way to serve the same desk on a second domain. Our separation of immutable `id` from mutable `routes[].slug` exists precisely to avoid that.

### What we are deliberately not copying

- Pixel-coordinate image map (breaks on mobile)
- Fixed content slots that cap what a scene can hold
- Subdomain doubling as identity, URL and personalisation token
- Six separate hardcoded overlay divs with inconsistent chrome
- A single scene type with no way to link scenes together
- Single-brand assumption baked through the config
- Flipbook snapshots of pages that change
- Stale third-party template branding left in assets
- Analytics IDs interpolated from unset environment variables
