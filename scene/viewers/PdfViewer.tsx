'use client';

import { AlertCircle, ExternalLink } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

import { Button } from 'components/ui/Button';
import type { ViewerProps } from './types';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function isMissingPdf(err: unknown): boolean {
  const e = err as { name?: string; status?: number; message?: string };
  if (e?.name === 'MissingPDFException') return true;
  if (e?.status === 404) return true;
  return /missing pdf|status: 404|404/i.test(e?.message ?? '');
}

/**
 * Canvas-per-page scroller. Cursor's browser (and iOS) never plugin-renders
 * `<object type="application/pdf">`, so a native embed always fell through.
 */
export default function PdfViewer({ item }: ViewerProps) {
  const src = item.kind === 'pdf' ? item.src : '';
  const initialPage = item.kind === 'pdf' ? item.initialPage : undefined;
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<'missing' | 'load' | null>(null);
  const [width, setWidth] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = el.clientWidth;
        setWidth(w => (Math.abs(w - next) < 8 ? w : next));
      });
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, [src, error]);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    setError(null);
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
      err => {
        if (cancelled) return;
        setError(isMissingPdf(err) ? 'missing' : 'load');
      },
    );

    return () => {
      cancelled = true;
      loading.destroy();
      doc?.destroy();
    };
  }, [src]);

  if (item.kind !== 'pdf') return null;

  return (
    <div className="relative size-full bg-neutral-950">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition hover:bg-background"
      >
        <ExternalLink className="size-3.5" />
        Open in new tab
      </a>

      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
          <AlertCircle className="size-8 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {error === 'missing'
              ? 'This PDF file is missing.'
              : 'Could not load this PDF.'}
          </p>
          <Button asChild>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 size-4" />
              Open {item.label}
            </a>
          </Button>
        </div>
      ) : (
        <div ref={scrollerRef} className="size-full overflow-y-auto px-4 py-6">
          {pdf && width > 0 ? (
            Array.from({ length: pdf.numPages }, (_, i) => (
              <PdfPage
                key={`${src}:${i + 1}`}
                pdf={pdf}
                pageNumber={i + 1}
                width={width - 32}
                focus={initialPage === i + 1}
              />
            ))
          ) : (
            <p className="py-20 text-center text-sm text-muted-foreground">Loading PDF…</p>
          )}
        </div>
      )}
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  width,
  focus,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  focus?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(Math.max(width / base.width, 0.4), 2.5);
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
        if (!cancelled && focus) canvas.scrollIntoView({ block: 'start' });
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
  }, [pdf, pageNumber, width, focus]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto mb-4 block max-w-full bg-white shadow-lg"
    />
  );
}
