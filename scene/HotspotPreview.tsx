'use client';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

import { cn } from 'components/ui/utils';
import { itemKindForMedia, resolveMedia } from './media';
import { isSafeUrl } from './schema';
import type { LetterItem, ResolvedItem } from './types';
import { letterText } from './letterTokens';
import { WebsiteShot } from './websiteShot';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Clipped miniature of the real content on a desk hotspot. Click handling
 * stays on the button/`<a>` — faces are `pointer-events-none`.
 */
export function HotspotPreview({
  item,
  showOutlines,
}: {
  item: ResolvedItem;
  showOutlines?: boolean;
}) {
  return (
    <span
      className={cn(
        'scene-hotspot',
        showOutlines &&
          'bg-[var(--brand-accent)]/20 shadow-[0_0_0_1px_var(--brand-accent)]',
      )}
    >
      <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <Face item={item} />
      </span>
    </span>
  );
}

function Face({ item }: { item: ResolvedItem }) {
  const spec = faceFor(item);
  if (!spec) return null;

  switch (spec.type) {
    case 'letter':
      return <LetterMini item={spec.item} />;
    case 'video':
      return <VideoMini src={spec.src} poster={spec.poster} />;
    case 'pdf':
      return <PdfMini src={spec.src} />;
    case 'image':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={spec.src}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />
      );
    case 'shot':
      return (
        <WebsiteShot
          href={spec.href}
          label=""
          width={640}
          className="pointer-events-none absolute inset-0"
        />
      );
  }
}

type FaceSpec =
  | { type: 'letter'; item: LetterItem }
  | { type: 'video'; src?: string; poster?: string }
  | { type: 'pdf'; src: string }
  | { type: 'image'; src: string }
  | { type: 'shot'; href: string };

function isHttpPage(href: string) {
  if (/^(mailto|tel):/i.test(href)) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const protocol = new URL(href, 'https://localhost').protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function videoFace(src: string, poster?: string): FaceSpec {
  const media = resolveMedia(src);
  return {
    type: 'video',
    src: media.embedUrl ? undefined : media.url,
    poster: poster ?? media.posterUrl,
  };
}

function shotFace(href: string): FaceSpec | null {
  if (!isSafeUrl(href) || !isHttpPage(href)) return null;
  return { type: 'shot', href };
}

function faceFor(item: ResolvedItem): FaceSpec | null {
  switch (item.kind) {
    case 'letter':
      return { type: 'letter', item };
    case 'video':
      return videoFace(item.src, item.poster);
    case 'pdf':
      return isSafeUrl(item.src) ? { type: 'pdf', src: item.src } : null;
    case 'image':
      return isSafeUrl(item.src) ? { type: 'image', src: item.src } : null;
    case 'embed':
      return shotFace(item.src);
    case 'link':
      return shotFace(item.href);
    case 'auto': {
      const media = resolveMedia(item.src);
      const kind = item.as ?? itemKindForMedia(media);
      if (kind === 'video') return videoFace(media.url, item.poster ?? media.posterUrl);
      if (kind === 'pdf' && isSafeUrl(media.url)) return { type: 'pdf', src: media.url };
      if (kind === 'image' && isSafeUrl(media.url)) return { type: 'image', src: media.url };
      if (kind === 'embed' || kind === 'link') return shotFace(media.embedUrl ?? media.url);
      return null;
    }
    default:
      return null;
  }
}

const LETTER_W = 420;
const LETTER_H = 544;

function LetterMini({ item }: { item: LetterItem }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const paragraphs = letterText(item.bodyMdx).split(/\n{2,}/).filter(Boolean);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.min(el.clientWidth / LETTER_W, el.clientHeight / LETTER_H);
        setScale(s => (Math.abs(s - next) < 0.008 ? s : next));
      });
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <article
        className="absolute left-1/2 top-0 overflow-hidden bg-[#f8f7f3] text-[#1c1e22]"
        style={{
          width: LETTER_W,
          height: LETTER_H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        <div className="flex h-full flex-col px-10 py-9">
          {item.letterheadSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.letterheadSrc} alt="" className="mb-6 h-9 w-auto" />
          )}
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-3 whitespace-pre-line text-[12px] leading-relaxed">
              {p}
            </p>
          ))}
          {item.signature && (
            <footer className="mt-auto border-t border-black/10 pt-4">
              {item.signature.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.signature.image} alt="" className="mb-2 h-10 w-auto" />
              )}
              <p className="text-[12px] font-semibold">{item.signature.name}</p>
              <p className="text-[10px] text-[#5c626c]">{item.signature.title}</p>
            </footer>
          )}
        </div>
      </article>
    </div>
  );
}

function VideoMini({ src, poster }: { src?: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (mq.matches) {
        el.pause();
      } else {
        void el.play().catch(() => {});
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      el.pause();
    };
  }, [src]);

  if (!src) {
    if (!poster) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="pointer-events-none absolute inset-0 size-full object-cover"
    />
  );
}

function PdfMini({ src }: { src: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<RenderTask | null>(null);
  const [width, setWidth] = useState(0);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = el.clientWidth;
        setWidth(w => (Math.abs(w - next) < 4 ? w : next));
      });
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, [src]);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    setPdf(null);

    const loading = getDocument({ url: src, withCredentials: false });
    loading.promise.then(
      loaded => {
        if (cancelled) {
          loaded.destroy();
          return;
        }
        doc = loaded;
        setPdf(loaded);
      },
      () => {
        /* missing or unreadable */
      },
    );

    return () => {
      cancelled = true;
      loading.destroy();
      doc?.destroy();
    };
  }, [src]);

  useEffect(() => {
    if (!pdf || width <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(Math.max(width / base.width, 0.15), 1.2);
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx || cancelled) return;

        const prev = taskRef.current;
        taskRef.current = null;
        if (prev) {
          prev.cancel();
          try {
            await prev.promise;
          } catch {
            /* RenderingCancelledException */
          }
        }
        if (cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const task = page.render({ canvasContext: ctx, viewport });
        taskRef.current = task;
        await task.promise;
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string })?.name === 'RenderingCancelledException') return;
      }
    })();

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
      taskRef.current = null;
    };
  }, [pdf, width]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 overflow-hidden bg-white">
      <canvas ref={canvasRef} className="block w-full bg-white" />
    </div>
  );
}
