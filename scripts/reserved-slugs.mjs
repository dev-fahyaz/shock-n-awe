#!/usr/bin/env node
/**
 * Generate the reserved-slug list from the filesystem.
 *
 * The scene route is a root-level catch-all (`app/[sceneSlug]/page.tsx`).
 * Static segments win, so a scene slugged `pricing` would silently never
 * render — no error, no 404, just the wrong page.
 *
 * Deriving the list from `app/` rather than hand-maintaining it means it
 * cannot drift when someone adds a static route.
 *
 * IF THIS APP SHARES A DOMAIN with the main website, that site's top-level
 * routes shadow scene slugs too. List them in `scene/reserved.extra.json`
 * and they are merged in here.
 *
 * Run in prebuild; `validate-scenes.mjs` consumes the output.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const appDir = resolve(root, 'app');
const extraFile = resolve(root, 'scene/reserved.extra.json');
const outFile = resolve(root, 'scene/reserved.json');

const fromApp = readdirSync(appDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  // Route groups `(name)`, private `_name` and dynamic `[name]` segments do
  // not occupy a literal URL path.
  .filter(e => !/^[([_]/.test(e.name))
  .map(e => e.name);

const extra = existsSync(extraFile)
  ? JSON.parse(readFileSync(extraFile, 'utf8'))
  : [];

// Anything served straight out of /public would also shadow a slug.
const always = ['api', 'scene', 'images', 'assets', 'static'];

const reserved = [...new Set([...fromApp, ...extra, ...always])].sort();

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(reserved, null, 2)}\n`);

console.log(
  `[scene] ${reserved.length} reserved slugs ` +
    `(${fromApp.length} from app/, ${extra.length} extra) -> scene/reserved.json`,
);
