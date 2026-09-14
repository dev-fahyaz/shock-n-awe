import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  StoreError,
  create,
  getById,
  isRemoteSource,
  list,
  remove,
  update,
} from 'scene/source/store';
import type { SceneConfig } from 'scene/types';

/**
 * Scene anatomy CRUD.
 *
 * Local JSON for now. Gated by SCENE_SETUP_SECRET; if that is unset, writes
 * are allowed only outside production.
 */

function authorized(req: Request): boolean {
  const secret = process.env.SCENE_SETUP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const provided = req.headers.get('x-scene-secret') ?? '';
  return provided.length === secret.length && provided === secret;
}

function deny() {
  return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
}

function fail(err: unknown) {
  if (err instanceof StoreError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  const message = err instanceof Error ? err.message : 'unknown error';
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

function touch(scene: SceneConfig, extra: string[] = []) {
  const slugs = [
    ...scene.routes.map(r => r.slug),
    ...(scene.routes.flatMap(r => r.slugHistory ?? [])),
    ...extra,
  ];
  for (const slug of new Set(slugs)) revalidatePath(`/${slug}`);
  revalidatePath('/');
  revalidatePath('/setup');
  revalidatePath(`/setup/${scene.id}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return deny();

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const scene = await getById(id);
      if (!scene) {
        return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, scene });
    }
    return NextResponse.json({ ok: true, scenes: await list() });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return deny();
  if (isRemoteSource()) {
    return NextResponse.json(
      { ok: false, error: 'cannot write to a remote scene source' },
      { status: 501 },
    );
  }

  try {
    let body: Partial<SceneConfig> = {};
    const text = await req.text();
    if (text) body = JSON.parse(text) as Partial<SceneConfig>;
    const scene = await create(body);
    touch(scene);
    return NextResponse.json({ ok: true, scene }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(req: Request) {
  if (!authorized(req)) return deny();

  try {
    const body = (await req.json()) as SceneConfig;
    if (!body?.id) {
      return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
    }
    const scene = await update(body.id, body);
    touch(scene);
    return NextResponse.json({ ok: true, scene });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: Request) {
  if (!authorized(req)) return deny();

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
    }
    const scene = await remove(id);
    touch(scene, []);
    revalidatePath(`/setup/${id}`);
    return NextResponse.json({ ok: true, scene });
  } catch (err) {
    return fail(err);
  }
}
