#!/usr/bin/env node
/**
 * CI guard for compiled scene config (slug collisions, canonical integrity).
 * Live posts live in Supabase; there is no local JSON catalog to check.
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

/* ---------------- live catalog is Supabase ---------------- */

if (process.env.SCENE_SOURCE_URL && /^https?:\/\//i.test(process.env.SCENE_SOURCE_URL)) {
  console.log(
    `\n[scene] dynamic source is remote (${process.env.SCENE_SOURCE_URL}) — not checked at build time.`,
  );
}

try {
  rmSync(outDir, { recursive: true, force: true });
} catch {
  /* temp output */
}

if (failed) process.exit(1);
console.log('\n[scene] no issues.\n');
