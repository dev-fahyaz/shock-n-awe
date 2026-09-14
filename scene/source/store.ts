import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { parseScenes, sceneConfigSchema, type ValidatedScene } from '../schema';
import type { SceneConfig, SceneRoute, SiteKey } from '../types';

/**
 * Local JSON store.
 *
 * The live source for scenes until a database lands. Reads and writes
 * `content/scenes.json` (or a file path in `SCENE_SOURCE_URL`). Every write is
 * schema-validated. Slug changes append to `slugHistory`.
 */

const DEFAULT_FILE = 'content/scenes.json';
const ALWAYS_RESERVED = ['api', 'setup', 'scene', 'images', 'assets', 'static'];

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export function storePath(): string {
  const src = process.env.SCENE_SOURCE_URL;
  if (src && !/^https?:\/\//i.test(src)) return resolve(process.cwd(), src);
  return resolve(process.cwd(), DEFAULT_FILE);
}

export function isRemoteSource(): boolean {
  return /^https?:\/\//i.test(process.env.SCENE_SOURCE_URL ?? '');
}

async function reservedSlugs(): Promise<Set<string>> {
  try {
    const raw = JSON.parse(
      await readFile(resolve(process.cwd(), 'scene/reserved.json'), 'utf8'),
    );
    const fromFile = Array.isArray(raw) ? (raw as string[]) : [];
    return new Set([...ALWAYS_RESERVED, ...fromFile]);
  } catch {
    return new Set(ALWAYS_RESERVED);
  }
}

let cache: { at: number; scenes: ValidatedScene[] } | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

export function invalidateSceneCache() {
  cache = null;
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function seedIfMissing(path: string): Promise<void> {
  try {
    await readFile(path, 'utf8');
  } catch {
    const { allScenes } = await import('../configs');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(allScenes(), null, 2)}\n`, 'utf8');
  }
}

async function readAll(): Promise<ValidatedScene[]> {
  if (cache) return cache.scenes;
  if (isRemoteSource()) {
    return [];
  }

  const path = storePath();
  await seedIfMissing(path);

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    throw new StoreError(
      `scene store unreadable: ${err instanceof Error ? err.message : 'unknown'}`,
      500,
    );
  }

  const report = parseScenes(raw);
  if (report.issues.length) {
    console.warn(
      `[scene] ${report.issues.length} config issue(s), ` +
        `${report.droppedItems} item(s) dropped:\n  ` +
        report.issues.slice(0, 20).join('\n  '),
    );
  }

  cache = { at: Date.now(), scenes: report.scenes };
  return report.scenes;
}

async function assertRoutes(scenes: ValidatedScene[]) {
  const reservedSet = await reservedSlugs();
  const claimed = new Map<string, string>();

  for (const scene of scenes) {
    for (const route of scene.routes) {
      if (reservedSet.has(route.slug)) {
        throw new StoreError(
          `slug "${route.slug}" is reserved and will never render`,
        );
      }
      const key = `${route.site}:${route.slug}`;
      const owner = claimed.get(key);
      if (owner && owner !== scene.id) {
        throw new StoreError(
          `slug "${route.slug}" on ${route.site} is already used by "${owner}"`,
        );
      }
      claimed.set(key, scene.id);
    }
  }
}

async function persist(scenes: ValidatedScene[]) {
  await assertRoutes(scenes);
  const parsed = scenes.map(s => {
    const result = sceneConfigSchema.safeParse(s);
    if (!result.success) {
      const msg = result.error.issues[0];
      throw new StoreError(
        `${s.id}: ${msg?.path.join('.') || 'config'} — ${msg?.message ?? 'invalid'}`,
      );
    }
    return result.data;
  });

  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  cache = { at: Date.now(), scenes: parsed };
}

function asConfig(scene: ValidatedScene): SceneConfig {
  return scene as unknown as SceneConfig;
}

function withSlugHistory(
  previous: ValidatedScene | undefined,
  next: ValidatedScene,
): ValidatedScene {
  if (!previous) return next;

  const routes = next.routes.map(route => {
    const old = previous.routes.find(r => r.site === route.site);
    if (!old || old.slug === route.slug) return route;
    const history = [
      ...new Set([...(route.slugHistory ?? []), ...(old.slugHistory ?? []), old.slug]),
    ].filter(s => s !== route.slug);
    return { ...route, slugHistory: history };
  });

  return { ...next, routes };
}

export async function list(): Promise<SceneConfig[]> {
  return (await readAll()).map(asConfig);
}

export async function getById(id: string): Promise<SceneConfig | null> {
  const scene = (await readAll()).find(s => s.id === id);
  return scene ? asConfig(scene) : null;
}

export async function getByRoute(
  site: SiteKey,
  slug: string,
  liveOnly = true,
): Promise<{ config: SceneConfig; route: SceneRoute } | null> {
  for (const scene of await readAll()) {
    const route = scene.routes.find(
      r =>
        r.site === site &&
        r.slug === slug &&
        (!liveOnly || r.status === 'live'),
    );
    if (route) return { config: asConfig(scene), route: route as SceneRoute };
  }
  return null;
}

export function newSceneId(): string {
  return `s-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function blankScene(id: string): SceneConfig {
  const slug = `untitled-${id.slice(2, 8)}`;
  return {
    id,
    routes: [{ site: 'asat', slug, status: 'draft' }],
    preset: 'custom',
    layout: 'freeform',
    audience: { nameplate: 'Untitled scene' },
    stage: {},
    items: [],
    seo: { title: 'Untitled scene', description: '' },
  };
}

export async function create(input?: Partial<SceneConfig>): Promise<SceneConfig> {
  if (isRemoteSource()) {
    throw new StoreError('cannot write to a remote scene source', 501);
  }

  return locked(async () => {
    const scenes = await readAll();
    const id = input?.id && !scenes.some(s => s.id === input.id)
      ? input.id
      : newSceneId();
    const draft = { ...blankScene(id), ...input, id };
    const parsed = sceneConfigSchema.safeParse(draft);
    if (!parsed.success) {
      const msg = parsed.error.issues[0];
      throw new StoreError(
        `${msg?.path.join('.') || 'config'} — ${msg?.message ?? 'invalid'}`,
      );
    }
    await persist([...scenes, parsed.data]);
    return asConfig(parsed.data);
  });
}

export async function update(id: string, input: SceneConfig): Promise<SceneConfig> {
  if (isRemoteSource()) {
    throw new StoreError('cannot write to a remote scene source', 501);
  }
  if (input.id !== id) {
    throw new StoreError('scene id is immutable');
  }

  return locked(async () => {
    const scenes = await readAll();
    const index = scenes.findIndex(s => s.id === id);
    if (index === -1) throw new StoreError(`scene "${id}" not found`, 404);

    const parsed = sceneConfigSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0];
      throw new StoreError(
        `${msg?.path.join('.') || 'config'} — ${msg?.message ?? 'invalid'}`,
      );
    }

    const next = withSlugHistory(scenes[index], parsed.data);
    const copy = [...scenes];
    copy[index] = next;
    await persist(copy);
    return asConfig(next);
  });
}

export async function remove(id: string): Promise<SceneConfig> {
  if (isRemoteSource()) {
    throw new StoreError('cannot write to a remote scene source', 501);
  }

  return locked(async () => {
    const scenes = await readAll();
    const scene = scenes.find(s => s.id === id);
    if (!scene) throw new StoreError(`scene "${id}" not found`, 404);
    await persist(scenes.filter(s => s.id !== id));
    return asConfig(scene);
  });
}

export async function redirects(): Promise<Record<SiteKey, Record<string, string>>> {
  const map: Record<SiteKey, Record<string, string>> = { asat: {}, aspire: {} };
  for (const scene of await readAll()) {
    for (const route of scene.routes) {
      for (const old of route.slugHistory ?? []) {
        map[route.site][old] = route.slug;
      }
    }
  }
  return map;
}

export async function liveLinks(
  site: SiteKey,
): Promise<Record<string, string>> {
  const links: Record<string, string> = {};
  for (const scene of await readAll()) {
    const route = scene.routes.find(r => r.site === site && r.status === 'live');
    if (route) links[scene.id] = route.slug;
  }
  return links;
}
