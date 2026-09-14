#!/usr/bin/env node
/**
 * Dump compiled scene configs into content/scenes.json.
 *
 * One-shot seed so the live source is data, not TypeScript. After this, add /
 * edit / delete go through the JSON store.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outDir = resolve(root, '.scene-validate');
const dest = resolve(root, 'content/scenes.json');

rmSync(outDir, { recursive: true, force: true });

const tsc = resolve(
  root,
  'node_modules/typescript/bin/tsc',
);

execFileSync(
  process.execPath,
  [
    tsc,
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

writeFileSync(resolve(outDir, 'package.json'), '{"type":"commonjs"}\n');

const require = createRequire(import.meta.url);
const configs = require(resolve(outDir, 'scene/configs/index.js'));
const scenes = configs.allScenes();

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, `${JSON.stringify(scenes, null, 2)}\n`);

rmSync(outDir, { recursive: true, force: true });
console.log(`[scene] seeded ${scenes.length} scene(s) → content/scenes.json`);
