#!/usr/bin/env node
/**
 * CI guard for scene config.
 *
 * Two passes:
 *
 *  1. COMPILED scenes (`scene/configs`) — slug collisions, duplicates,
 *     canonical integrity, missing parents and scene-link targets.
 *  2. DYNAMIC scenes (`SCENE_SOURCE_URL`, when it points at a local file) —
 *     the same structural checks, plus full schema validation and URL safety.
 *
 * The second pass is the one that matters most. Compiled config is checked by
 * TypeScript; JSON from a CMS is checked by nothing until it reaches a browser.
 *
 * Run after `reserved-slugs.mjs`, before `next build`.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const reservedPath = resolve(root, 'scene/reserved.json');
const outDir = resolve(root, '.scene-validate');

if (!existsSync(reservedPath)) {
  console.error('[scene] reserved.json missing — run scripts/reserved-slugs.mjs first');
  process.exit(1);
}
const reserved = JSON.parse(readFileSync(reservedPath, 'utf8'));

try {
  rmSync(outDir, { recursive: true, force: true });
} catch {
  /* stale output is overwritten anyway */
}

try {
  execFileSync(
    'npx',
    [
      'tsc',
      'scene/configs/index.ts',
      'scene/schema.ts',
      '--outDir', outDir,
      '--rootDir', '.',
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--target', 'es2022',
      '--skipLibCheck',
      '--esModuleInterop',
      '--resolveJsonModule',
    ],
    { cwd: root, stdio: 'inherit' },
  );
} catch {
  console.error('[scene] could not compile scene configs');
  process.exit(1);
}

// The repo is `"type": "module"`, so CommonJS output needs its own marker.
writeFileSync(resolve(outDir, 'package.json'), '{"type":"commonjs"}\n');

const require = createRequire(import.meta.url);
const configs = require(resolve(outDir, 'scene/configs/index.js'));
const schema = require(resolve(outDir, 'scene/schema.js'));

let failed = false;

/* ---------------- pass 1: compiled ---------------- */

const issues = configs.validateScenes(reserved);
const routes = configs.allLiveRoutes();

console.log(`\n[scene] compiled — ${routes.length} live route(s):`);
for (const { scene, route } of routes) {
  const flags = [
    route.canonical ? 'canonical' : null,
    route.indexable === false ? 'noindex' : 'index',
  ].filter(Boolean).join(', ');
  console.log(`  ${route.site.padEnd(7)} /${route.slug.padEnd(24)} ${scene.id}  [${flags}]`);
}

if (issues.length) {
  failed = true;
  console.error(`\n[scene] ${issues.length} issue(s) in compiled config:`);
  for (const issue of issues) console.error(`  x ${issue.sceneId}: ${issue.message}`);
}

/* ---------------- pass 2: JSON store ---------------- */

const sourceUrl = process.env.SCENE_SOURCE_URL;
if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
  console.log(`\n[scene] dynamic source is remote (${sourceUrl}) — not checked at build time.`);
} else {
  const jsonPath = resolve(
    root,
    sourceUrl && !/^https?:\/\//i.test(sourceUrl) ? sourceUrl : 'content/scenes.json',
  );

  if (!existsSync(jsonPath)) {
    console.error(`\n[scene] missing scene store: ${jsonPath}`);
    failed = true;
  } else {
    let raw;
    try {
      raw = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch (err) {
      console.error(`\n[scene] ${jsonPath} is not valid JSON: ${err.message}`);
      process.exit(1);
    }

    const report = schema.parseScenes(raw);
    const total = Array.isArray(raw) ? raw.length : 0;
    const label = sourceUrl || 'content/scenes.json';

    console.log(
      `\n[scene] store (${label}) — ${report.scenes.length}/${total} scene(s) valid:`,
    );
    for (const s of report.scenes) {
      for (const r of s.routes.filter(r => r.status === 'live')) {
        const flags = [
          r.canonical ? 'canonical' : null,
          r.indexable === false ? 'noindex' : 'index',
        ].filter(Boolean).join(', ');
        console.log(`  ${r.site.padEnd(7)} /${r.slug.padEnd(24)} ${s.id}  [${flags}]`);
      }
    }

    for (const s of report.scenes) {
      for (const r of s.routes.filter(r => r.status === 'live')) {
        if (reserved.includes(r.slug)) {
          console.error(`  x ${s.id}: slug "${r.slug}" collides with an existing page`);
          failed = true;
        }
      }
    }

    if (report.issues.length) {
      console.error(
        `\n[scene] ${report.issues.length} issue(s), ${report.droppedItems} item(s) dropped:`,
      );
      for (const i of report.issues) console.error(`  x ${i}`);
      failed = true;
    }
  }
}

try {
  rmSync(outDir, { recursive: true, force: true });
} catch {
  /* temp output */
}

if (failed) process.exit(1);
console.log('\n[scene] no issues.\n');
