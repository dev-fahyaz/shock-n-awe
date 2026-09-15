import { NextResponse } from 'next/server';

import { setupAuthorized, setupDeny, setupFail } from 'scene/setup/guard';
import { getById } from 'scene/source/store';
import {
  MAX_UPLOAD_BYTES,
  insertMediaRow,
  isSupabaseConfigured,
  publicMediaUrl,
  removeObjects,
  requireSupabase,
  uploadObject,
  type MediaKind,
} from 'scene/source/supabase';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function kindFromFile(file: File, requested?: string): MediaKind | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (IMAGE_TYPES.has(file.type) || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)) {
    return 'image';
  }
  if (requested === 'pdf' || requested === 'image') return requested;
  return null;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
}

export async function POST(req: Request) {
  if (!setupAuthorized(req)) return setupDeny();
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 503 },
    );
  }

  try {
    requireSupabase();
    const form = await req.formData();
    const sceneId = String(form.get('sceneId') ?? '').trim();
    const requested = String(form.get('kind') ?? '').trim();
    const file = form.get('file');
    if (!sceneId) {
      return NextResponse.json({ ok: false, error: 'sceneId required' }, { status: 400 });
    }
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ ok: false, error: 'file required' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, error: `file exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit` },
        { status: 413 },
      );
    }

    const scene = await getById(sceneId);
    if (!scene) {
      return NextResponse.json(
        { ok: false, error: 'save the scene before uploading files' },
        { status: 404 },
      );
    }

    const kind = kindFromFile(file, requested);
    if (!kind) {
      return NextResponse.json(
        { ok: false, error: 'upload images or PDFs only; video stays an external URL' },
        { status: 400 },
      );
    }

    const id = `m-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const path = `${sceneId}/${id}-${safeName(file.name)}`;
    const mime = file.type || (kind === 'pdf' ? 'application/pdf' : 'application/octet-stream');
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await uploadObject(kind, path, buffer, mime);
      await insertMediaRow({
        id,
        scene_id: sceneId,
        kind,
        path,
        mime,
        bytes: file.size,
        label: file.name,
      });
    } catch (err) {
      await removeObjects(kind, [path]).catch(() => undefined);
      throw err;
    }

    return NextResponse.json({
      ok: true,
      id,
      kind,
      path,
      url: publicMediaUrl(kind, path),
    });
  } catch (err) {
    return setupFail(err);
  }
}
