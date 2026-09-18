# Using Setup

Operator guide for Shock and Awe. Build and deploy: [`README.md`](../README.md).

SAT is brand key `asat` (securityawarenesstraining.ai). Aspire is `aspire` (aspiretss.com).

Sign in at `/login` with the email and password of a Supabase Auth user that also has `app_users.role = admin`. `/` and `/setup` redirect to login otherwise. Live scene URLs (`/{slug}`) stay public — visitors on SAT/Aspire never see Back, Setup, or the catalog.

Seed an admin (SQL editor), after creating the user in Authentication:

```sql
insert into public.app_users (id, email, role)
values ('<auth user uuid>', 'you@example.com', 'admin');
```

---

## Scene list (`/setup`)

`/` is the signed-in index of live scenes. `/setup` is the operator list (noindex).

- **Add** creates a scene (starts as SAT draft) and opens the editor.
- **SAT** and **Aspire** chips cycle `off` → `draft` → `live`. Click to assign or drop a brand, then save writes `routes[]`.
- When both are live, SAT stays canonical; Aspire is typically not indexable.
- Open a row to edit. Delete removes the scene and its Storage files (cascade).
- **Remove unused files** deletes `sna_media` rows and bucket objects that no scene config still points at.

The collapsed URL fold on a row shows a summary such as `URL · SAT live · Aspire off`.

Scenes are stored in Supabase only. There is no local JSON catalog.

---

## Editor (`/setup/[id]`)

Three collapsible sections:

| Section | What you set |
|---|---|
| **URL** | Slug per brand, live/draft/off, canonical / indexable |
| **Anatomy** | Stage image, layout, nameplate, SEO title and description, OG image |
| **Items** | Hotspots: kind, label, files, letter body, links |

Save writes the full config to `sna_scenes`. Files go to Storage (50 MB cap). YouTube / Vimeo / Loom stay an **https URL** on a video item — they are not uploaded.

### Files

Use the file picker. There is no `/scene/...` path box.

| Kind | How |
|---|---|
| Image, PDF, audio, poster, background, download | Upload a file |
| Video | Upload a file **or** paste a YouTube / Vimeo / Loom URL |
| Letter | Typed body (and optional letterhead / signature image) |

Audio, video, images, and PDFs land in `scene-audio`, `scene-video`, `scene-images`, and `scene-docs`.

### Position hotspots

After save, open `/{slug}?setup=<id>` (the editor links this). Drag and resize items on the stage. Width/height sliders in the editor match those boxes.

A prop should get a hotspot only when it **carries content** — a document, a screen, a letter, a person. Mugs and plants stay dressing. A cover with a signature is a **letter**, not a PDF. A tablet showing a player is a **video**. A DOWNLOAD button is a **download**.

---

## What visitors see

On the desk, a letter is scaled to its item box so the full text is visible. Click opens the modal (scrollable letter). Videos autoplay muted on the hotspot (uploaded file or YouTube/Vimeo).

Click either opens the modal **or** navigates — never both.

| Item | Result |
|---|---|
| `link` | Same-tab redirect (`target: "_blank"` to opt out) |
| `scene` | Other scene slug on this brand |
| `download` | File download |
| everything else | Modal (PDF, letter, video, audio, image, embed, …) |

`kind: "auto"` takes a URL and picks a viewer (YouTube → video, `.pdf` → PDF, and so on). Set `"as"` when detection is wrong.

Recipient tokens such as `{{firstName}}` in a letter resolve from `?r=` after first paint so the page can stay cached.

A scene assigned **live** for a brand is what SAT/Aspire will iframe. Draft stays in Setup only. The iframe has no Back control into this engine.
