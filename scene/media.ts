/**
 * Universal media resolution.
 *
 * The point of "dynamic ready": a marketer pastes a URL — any URL — and the
 * right viewer opens. A YouTube link, a Vimeo link, a Google Drive file, a
 * PDF on S3, an mp4 on a CDN, a PowerPoint on SharePoint, a plain image.
 *
 * Detection order matters. Provider matching runs BEFORE extension matching,
 * because `youtube.com/watch?v=x&feature=.mp4` should still be a YouTube
 * embed, not a direct video source.
 *
 * Nothing here trusts its input. `resolveMedia` never throws — an unparseable
 * string comes back as `kind: 'unknown'`, which the viewer layer renders as a
 * plain external link rather than a broken embed.
 */

export type MediaKind =
  | 'video'
  | 'audio'
  | 'pdf'
  | 'image'
  | 'office'
  | 'page'
  | 'archive'
  | 'unknown';

export type MediaProvider =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'wistia'
  | 'dailymotion'
  | 'drive'
  | 'onedrive'
  | 'dropbox'
  | 'direct'
  | 'unknown';

export interface ResolvedMedia {
  kind: MediaKind;
  provider: MediaProvider;
  /** The original URL, normalised where a provider needed rewriting. */
  url: string;
  /** Iframe-ready URL. Present for providers and for Office documents. */
  embedUrl?: string;
  /** Direct file URL, when one can be derived. Drives the download button. */
  fileUrl?: string;
  posterUrl?: string;
  filename?: string;
  ext?: string;
  /** True when the host differs from the app's own origin. */
  external: boolean;
}

/* ------------------------------------------------------------------ *
 * Extension tables
 * ------------------------------------------------------------------ */

const EXT: Record<string, MediaKind> = {
  // video
  mp4: 'video', m4v: 'video', webm: 'video', ogv: 'video', mov: 'video',
  m3u8: 'video', mpd: 'video',
  // audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', oga: 'audio', m4a: 'audio',
  aac: 'audio', flac: 'audio',
  // documents
  pdf: 'pdf',
  // images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  avif: 'image', svg: 'image', bmp: 'image',
  // office
  doc: 'office', docx: 'office', xls: 'office', xlsx: 'office',
  ppt: 'office', pptx: 'office', odt: 'office', ods: 'office', odp: 'office',
  // archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
};

/** Office formats that the Microsoft online viewer can render. */
const OFFICE_VIEWABLE = new Set([
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);

const OFFICE_VIEWER = 'https://view.officeapps.live.com/op/embed.aspx?src=';

/* ------------------------------------------------------------------ *
 * Provider matchers
 * ------------------------------------------------------------------ */

interface ProviderMatch {
  provider: MediaProvider;
  kind: MediaKind;
  embedUrl: string;
  posterUrl?: string;
}

function matchProvider(u: URL): ProviderMatch | null {
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname;

  // ---- YouTube -----------------------------------------------------
  if (host === 'youtu.be') {
    const id = path.slice(1).split('/')[0];
    if (id) return youtube(id, u);
  }
  if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    const id =
      u.searchParams.get('v') ??
      path.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1];
    if (id) return youtube(id, u);
  }

  // ---- Vimeo -------------------------------------------------------
  if (host.endsWith('vimeo.com')) {
    // Handles /123456789 and unlisted /123456789/abcdef0123
    const m = path.match(/^\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/);
    if (m) {
      const hash = m[2] ? `?h=${m[2]}` : '';
      return {
        provider: 'vimeo',
        kind: 'video',
        embedUrl: `https://player.vimeo.com/video/${m[1]}${hash}`,
      };
    }
  }

  // ---- Loom --------------------------------------------------------
  if (host.endsWith('loom.com')) {
    const m = path.match(/^\/(?:share|embed)\/([A-Za-z0-9]+)/);
    if (m) {
      return {
        provider: 'loom',
        kind: 'video',
        embedUrl: `https://www.loom.com/embed/${m[1]}`,
      };
    }
  }

  // ---- Wistia ------------------------------------------------------
  if (host.endsWith('wistia.com') || host.endsWith('wistia.net')) {
    const m = path.match(/\/(?:medias|embed\/iframe)\/([A-Za-z0-9]+)/);
    if (m) {
      return {
        provider: 'wistia',
        kind: 'video',
        embedUrl: `https://fast.wistia.net/embed/iframe/${m[1]}`,
      };
    }
  }

  // ---- Dailymotion -------------------------------------------------
  if (host.endsWith('dailymotion.com') || host === 'dai.ly') {
    const m = path.match(/\/(?:video\/)?([A-Za-z0-9]+)/);
    if (m) {
      return {
        provider: 'dailymotion',
        kind: 'video',
        embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}`,
      };
    }
  }

  // ---- Google Drive ------------------------------------------------
  // A share link is not viewable in an iframe; /preview is.
  if (host === 'drive.google.com') {
    const id =
      path.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get('id');
    if (id) {
      return {
        provider: 'drive',
        kind: 'page',
        embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      };
    }
  }
  if (host === 'docs.google.com') {
    // /document|spreadsheets|presentation/d/<id>/edit → /preview
    const m = path.match(/^\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
    if (m) {
      return {
        provider: 'drive',
        kind: 'page',
        embedUrl: `https://docs.google.com/${m[1]}/d/${m[2]}/preview`,
      };
    }
  }

  // ---- Dropbox -----------------------------------------------------
  // ?dl=0 renders Dropbox's own chrome; raw=1 serves the file itself.
  if (host.endsWith('dropbox.com')) {
    const raw = new URL(u.toString());
    raw.searchParams.delete('dl');
    raw.searchParams.set('raw', '1');
    const ext = extOf(path);
    return {
      provider: 'dropbox',
      kind: (ext && EXT[ext]) || 'page',
      embedUrl: raw.toString(),
    };
  }

  return null;
}

function youtube(id: string, u: URL): ProviderMatch {
  const params = new URLSearchParams();
  const start = u.searchParams.get('t') ?? u.searchParams.get('start');
  if (start) params.set('start', String(parseInt(start, 10) || 0));
  params.set('rel', '0');
  params.set('modestbranding', '1');

  return {
    provider: 'youtube',
    kind: 'video',
    // nocookie avoids setting an advertising cookie before consent.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params}`,
    posterUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

/** Provider iframes: autoplay (usually muted). Loop/playlist for desk miniatures. */
export function withEmbedPlayback(
  embedUrl: string,
  opts: { muted?: boolean; loop?: boolean; controls?: boolean } = {},
): string {
  const muted = opts.muted ?? true;
  const loop = opts.loop ?? false;
  const controls = opts.controls ?? true;
  try {
    const u = new URL(embedUrl);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      const id = u.pathname.match(/\/embed\/([^/]+)/)?.[1];
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('playsinline', '1');
      u.searchParams.set('enablejsapi', '1');
      u.searchParams.set('rel', '0');
      if (muted) u.searchParams.set('mute', '1');
      if (!controls) u.searchParams.set('controls', '0');
      if (loop && id) {
        u.searchParams.set('loop', '1');
        u.searchParams.set('playlist', id);
      }
    } else if (host.endsWith('vimeo.com')) {
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('playsinline', '1');
      if (muted) u.searchParams.set('muted', '1');
      if (loop) u.searchParams.set('loop', '1');
      if (!controls) u.searchParams.set('background', '1');
    } else if (host.endsWith('loom.com')) {
      u.searchParams.set('autoplay', 'true');
      u.searchParams.set('hide_share', 'true');
      if (muted) u.searchParams.set('mute_video', 'true');
      if (!controls) u.searchParams.set('hide_owner', 'true');
    } else if (host.endsWith('wistia.net') || host.endsWith('wistia.com')) {
      u.searchParams.set('autoPlay', 'true');
      u.searchParams.set('playsinline', 'true');
      if (muted) u.searchParams.set('muted', 'true');
      if (!controls) u.searchParams.set('controlsVisibleOnLoad', 'false');
      if (loop) u.searchParams.set('endVideoBehavior', 'loop');
    } else if (host.endsWith('dailymotion.com')) {
      u.searchParams.set('autoplay', '1');
      if (muted) u.searchParams.set('mute', '1');
      if (!controls) u.searchParams.set('controls', '0');
      if (loop) u.searchParams.set('loop', '1');
    } else {
      u.searchParams.set('autoplay', '1');
    }
    return u.toString();
  } catch {
    return embedUrl;
  }
}

export function withEmbedAutoplay(embedUrl: string, muted = true): string {
  return withEmbedPlayback(embedUrl, { muted, controls: true, loop: false });
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

function extOf(pathname: string): string | undefined {
  const base = pathname.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return undefined;
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Resolve any URL to something renderable.
 *
 * Accepts Storage public URLs and https provider links. Never throws.
 */
export function resolveMedia(input: string, origin?: string): ResolvedMedia {
  const raw = (input ?? '').trim();
  if (!raw) {
    return { kind: 'unknown', provider: 'unknown', url: '', external: false };
  }

  const base = origin ?? 'https://localhost';
  let u: URL;
  try {
    u = new URL(raw, base);
  } catch {
    return { kind: 'unknown', provider: 'unknown', url: raw, external: false };
  }

  const relative = !/^[a-z][a-z0-9+.-]*:/i.test(raw);
  const external = !relative && Boolean(origin) && u.origin !== origin;

  // Providers win over extensions — see the file header.
  const provider = matchProvider(u);
  if (provider) {
    return {
      kind: provider.kind,
      provider: provider.provider,
      url: raw,
      embedUrl: provider.embedUrl,
      posterUrl: provider.posterUrl,
      external: relative ? false : true,
    };
  }

  const ext = extOf(u.pathname);
  const filename = u.pathname.split('/').pop() || undefined;
  const kind = (ext && EXT[ext]) || 'page';

  const media: ResolvedMedia = {
    kind,
    provider: 'direct',
    url: raw,
    ext,
    filename,
    external,
  };

  if (kind !== 'page') media.fileUrl = raw;

  // Office documents cannot render inline; hand them to the MS viewer when the
  // URL is publicly reachable, otherwise the viewer falls back to download.
  if (kind === 'office' && ext && OFFICE_VIEWABLE.has(ext) && external) {
    media.embedUrl = OFFICE_VIEWER + encodeURIComponent(u.toString());
  }

  return media;
}

/** Which viewer `kind: 'auto'` should delegate to. */
export function itemKindForMedia(media: ResolvedMedia) {
  switch (media.kind) {
    case 'video':
      return 'video' as const;
    case 'audio':
      return 'audio' as const;
    case 'pdf':
      return 'pdf' as const;
    case 'image':
      return 'image' as const;
    case 'office':
      return media.embedUrl ? ('embed' as const) : ('download' as const);
    case 'archive':
      return 'download' as const;
    case 'page':
      return 'embed' as const;
    default:
      return 'link' as const;
  }
}

/** Best-effort human label, used when a config omits one. */
export function labelForMedia(media: ResolvedMedia): string {
  if (media.filename) return decodeURIComponent(media.filename);
  switch (media.provider) {
    case 'youtube':
    case 'vimeo':
    case 'loom':
    case 'wistia':
    case 'dailymotion':
      return 'Video';
    case 'drive':
      return 'Document';
    default:
      return 'Open';
  }
}
