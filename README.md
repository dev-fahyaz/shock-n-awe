# Shock and Awe

A config-driven engine for **interactive scenes** (desk, board, office). It is a standalone Next.js app. SAT ([securityawarenesstraining.ai](https://www.securityawarenesstraining.ai)) and Aspire ([aspiretss.com](https://aspiretss.com)) stay their own codebases; they ask a fetch helper whether a slug is live, then iframe this engine.

How to use Setup: [`docs/ui.md`](docs/ui.md). Engine internals: [`docs/Shock_and_Awe_Technical_Spec.md`](docs/Shock_and_Awe_Technical_Spec.md).

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev                    # http://localhost:3000
```

`/` and `/setup` are **admin-only** (Supabase Auth + `app_users.role = admin`). Live scenes are `/<slug>`. Sign in at `/login`.

| Command | What it does |
|---|---|
| `npm run dev` | Regenerates reserved slugs, then starts Next |
| `npm run build` | Same, then a production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:scenes` | Slug collisions, canonical integrity, schema |

On `localhost` the host matches neither brand, so resolution falls back to `asat`. Use `NEXT_PUBLIC_FORCE_SITE=aspire` to see the other brand.

---

## Environment

Copy [`.env.example`](.env.example). Required for Setup and live scenes:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Shared project URL (engine + host helper) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Scene data. Never `NEXT_PUBLIC_` |
| `SUPABASE_PUBLISHABLE_KEY` | Server-only. Admin login cookies (`sb_publishable_…`). Never `NEXT_PUBLIC_` |
| `SCENE_ENGINE_URL` | Public origin of this app, for SAT/Aspire iframes |

Optional:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GTM_ASAT` / `NEXT_PUBLIC_GTM_ASPIRE` | GTM containers. An unset id must render no tag |
| `NEXT_PUBLIC_FORCE_SITE` | `asat` \| `aspire` — override host resolution locally |
| `SKIP_ENV_CHECK=1` | Allow a production build with no analytics IDs |
| `SCENE_REVALIDATE_SECRET` | Shared secret for `POST /api/scene/revalidate` |
| `NEXT_PUBLIC_SCENE_EMBED_HOSTS` | Extra iframe hosts, comma separated |
| `SCENE_IMAGE_HOSTS` | Extra `next/image` hosts, comma separated |

`next.config.mjs` fails the production build when a brand GTM id is missing unless `SKIP_ENV_CHECK=1`.

---

## Supabase

Without these env vars the catalog is empty.

1. The project should already be online. Contact an administrator if the database is not present.
2. Tables `sna_scenes` and `sna_media` (`scene_id` FK), `get_live_post` RPC, public buckets `scene-images`, `scene-docs`, `scene-video`, `scene-audio`.
3. Put the project **URL**, **service role** key, and **publishable** key (Auth only) in `.env.local`.
4. In Supabase Auth, create the operator user. Insert `app_users` with that user's `id`, `email`, and `role = 'admin'`. There is no signup in the app.

| Layer | Holds |
|---|---|
| Postgres `sna_scenes` | Full scene JSON, including brand routes |
| Postgres `sna_media` | Image/PDF/video/audio rows keyed by `scene_id` |
| Postgres `app_users` | Auth user id, email, `role` (`admin` for Setup) |
| Storage | File bytes in the four buckets |
| Not in Storage | YouTube / Vimeo URLs stay embeds |

Uploads create a missing bucket if needed (so an older project without `scene-audio` still works). If a public file 404s after upload, re-run the `storage.buckets` insert and the `public read scene media` policy from `schema.sql`.

Free-tier caps: 500 MB database, 1 GB file storage, **50 MB max upload**. Keep uploaded video small.

---

## Deploy

1. Set the production env vars above (URL + service role + publishable key + `SCENE_ENGINE_URL`).
2. Run `schema.sql` once on the production Supabase project if it is a new project (includes `app_users`).
3. `npm run build` and host the Next app (Vercel or equivalent). The engine origin is what SAT/Aspire iframe.
4. Sign in at `/login`. Assign scenes **live** in `/setup`. A new live row is visible on the next host request (after a short cache). No per-slug rewrites on the marketing sites.

```
Setup (this repo) ──writes──► Supabase (config + Storage)
SAT / Aspire      ──fetch──► get_live_post(site, slug)
                  ──iframe─► SCENE_ENGINE_URL/{slug}
This engine       ──reads──► sna_scenes + Storage
```

---

## SAT and Aspire

Do not copy `scene/` into those apps. Copy [`scene/host/client.ts`](scene/host/client.ts) (or the local `host-kit/` drop-in) and set the same three env vars on **each host**.

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SCENE_ENGINE_URL=https://your-engine.example
```

One catch-all for a single unknown path segment (static routes still win). SAT uses `'asat'`; Aspire uses `'aspire'`. Do not list slugs in `next.config` rewrites.

```ts
import { getLiveRoute } from 'scene/host';

const SITE = 'asat'; // 'aspire' on Aspire

export default async function CatchAll({ params }: { params: { slug: string } }) {
  const route = await getLiveRoute(SITE, params.slug);
  if (!route) return null; // existing SAT/Aspire page or 404
  return (
    <iframe
      src={route.href}
      title={route.slug}
      className="h-screen w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-downloads"
      allow="autoplay; fullscreen; encrypted-media"
    />
  );
}
```

`listLiveRoutes(site)` is the same RPC with slug omitted (sitemap / nav). Cache is ~45 seconds. Helper prefers `get_live_post`. The engine’s `GET /api/scene/navigate` catalog (no slug) is admin-only.

If you copied `host-kit/`, see [`host-kit/JOIN.md`](host-kit/JOIN.md).

---

## Project layout

```
Shock-and-Awe/
├── app/                      routes: /login, index, /setup, /[sceneSlug]
├── middleware.ts             host → brand; old slug → 301
├── scene/                    engine, Setup client, Supabase source, host helper
├── supabase/schema.sql       tables, RPC, buckets
├── docs/ui.md                how to use Setup
├── scripts/                  reserved slugs + validate
└── public/scene/stages/      optional local stage art for compiled examples
```

Scene `id` is immutable. `slug` is not — old slugs land in `slugHistory` and middleware 301s them. The root catch-all must not collide with app routes; `scripts/reserved-slugs.mjs` plus `validate:scenes` guard that.
