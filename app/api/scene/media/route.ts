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
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']);
const AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
]);

function kindFromFile(file: File, requested?: string): MediaKind | null {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (VIDEO_TYPES.has(file.type) || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name)) {
    return 'video';
  }
  if (AUDIO_TYPES.has(file.type) || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) {
    return 'audio';
  }
  if (IMAGE_TYPES.has(file.type) || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)) {
    return 'image';
  }
  if (
    requested === 'pdf' ||
    requested === 'image' ||
    requested === 'video' ||
    requested === 'audio'
  ) {
    return requested;
  }
  return null;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
}

export async function POST(req: Request) {
  if (!(await setupAuthorized())) return setupDeny();
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
        { ok: false, error: 'upload an image, PDF, video, or audio file' },
        { status: 400 },
      );
    }

    const id = `m-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const path = `${sceneId}/${id}-${safeName(file.name)}`;
    const mime = file.type || 'application/octet-stream';
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
