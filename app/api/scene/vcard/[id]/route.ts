import { NextResponse } from 'next/server';

import { sceneSource } from 'scene/source';
import { currentSiteKey } from 'scene/sites';

/**
 * Generate a .vcf from a card item.
 *
 * Built from config rather than a stored file, so a phone number corrected in
 * the CMS is corrected in every contact anyone downloads afterwards.
 */
const esc = (v: string) => v.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const site = currentSiteKey();

  // Find the card across every live scene on this brand.
  for (const route of await sceneSource().allLiveRoutes()) {
    if (route.site !== site) continue;
    const scene = await sceneSource().getByRoute(site, route.slug);
    const item = scene?.items.find(i => i.id === params.id && i.kind === 'card');
    if (!item || item.kind !== 'card') continue;

    const p = item.person;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${esc(p.name)}`,
      `N:${esc(p.name.split(' ').slice(-1)[0])};${esc(p.name.split(' ')[0])};;;`,
      p.title ? `TITLE:${esc(p.title)}` : null,
      p.email ? `EMAIL;TYPE=INTERNET,WORK:${esc(p.email)}` : null,
      ...(p.phones ?? []).map(
        ph => `TEL;TYPE=WORK,VOICE:${esc(ph.number)}`,
      ),
      p.address ? `ADR;TYPE=WORK:;;${esc(p.address)};;;;` : null,
      p.website ? `URL:${esc(p.website)}` : null,
      ...(item.social ?? []).map(s => `X-SOCIALPROFILE;TYPE=${s.network}:${s.href}`),
      `REV:${new Date().toISOString()}`,
      'END:VCARD',
    ].filter(Boolean);

    return new NextResponse(lines.join('\r\n'), {
      headers: {
        'content-type': 'text/vcard; charset=utf-8',
        'content-disposition': `attachment; filename="${p.name.replace(/[^\w]+/g, '-')}.vcf"`,
        'cache-control': 'public, max-age=300',
      },
    });
  }

  return NextResponse.json({ error: 'card not found' }, { status: 404 });
}
