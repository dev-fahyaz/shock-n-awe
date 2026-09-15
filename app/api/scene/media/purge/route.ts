import { NextResponse } from 'next/server';

import { setupAuthorized, setupDeny, setupFail } from 'scene/setup/guard';
import { list } from 'scene/source/store';
import {
  collectStorageRefs,
  deleteMediaRows,
  isSupabaseConfigured,
  listBucketPaths,
  listMediaRows,
  mediaRefKey,
  removeObjects,
  type MediaKind,
} from 'scene/source/supabase';

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
    const scenes = await list();
    const refs = collectStorageRefs(scenes);
    const rows = await listMediaRows();
    const unused = rows.filter(row => !refs.has(mediaRefKey(row)));
    await deleteMediaRows(unused.map(r => r.id));

    let files = 0;
    for (const kind of ['image', 'pdf'] as MediaKind[]) {
      const paths = await listBucketPaths(kind);
      const drop = paths.filter(path => !refs.has(`${kind === 'pdf' ? 'scene-docs' : 'scene-images'}/${path}`));
      await removeObjects(kind, drop);
      files += drop.length;
    }

    return NextResponse.json({
      ok: true,
      media: unused.length,
      files,
    });
  } catch (err) {
    return setupFail(err);
  }
}
