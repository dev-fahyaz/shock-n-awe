'use client';

import { Download } from 'lucide-react';
import { Suspense, useEffect, useRef } from 'react';

import { Button } from 'components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from 'components/ui/Dialog';
import { Skeleton } from 'components/ui/Skeleton';
import { track } from './track';
import { useHrefSize } from './fileSize';
import { useScene } from './useSceneItem';
import { VIEWERS } from './viewers/registry';

/**
 * The single overlay host.
 *
 * The reference implementation hardcodes a separate overlay <div> per content
 * type, each with its own close button and inconsistent behaviour. One shell
 * owns all of that chrome instead — title, download affordance, close, focus
 * trap, escape, scroll lock — and renders whichever viewer the item needs.
 *
 * It also owns dwell timing: `scene_item_close` carries how long the item was
 * actually open, which is the number that tells you what a scene is worth.
 */
export function SceneModal() {
  const { activeItem, close, config } = useScene();
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!activeItem) return;

    openedAt.current = Date.now();
    track({
      event: 'scene_item_open',
      sceneId: config.id,
      itemId: activeItem.id,
      kind: activeItem.kind,
    });

    const itemId = activeItem.id;
    return () => {
      const started = openedAt.current;
      openedAt.current = null;
      if (started === null) return;
      track({
        event: 'scene_item_close',
        sceneId: config.id,
        itemId,
        dwellMs: Date.now() - started,
      });
    };
  }, [activeItem, config.id]);

  const sizeLabel = useHrefSize(activeItem?.download?.href);

  if (!activeItem) return null;

  const Viewer = VIEWERS[activeItem.kind];
  const download = activeItem.download;

  return (
    <Dialog open onOpenChange={isOpen => !isOpen && close()}>
      <DialogContent
        hideClose
        className="!flex h-[88vh] max-h-[88vh] w-[min(1100px,94vw)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-white/10 p-0"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base font-semibold">
              {activeItem.label}
            </DialogTitle>
            {activeItem.hint && (
              <DialogDescription className="truncate text-xs">
                {activeItem.hint}
              </DialogDescription>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* `download` lives on the item BASE, so any kind can carry one. */}
            {download && (
              <Button
                asChild
                variant="outline"
                size="sm"
                onClick={() =>
                  track({
                    event: 'scene_download',
                    sceneId: config.id,
                    itemId: activeItem.id,
                  })
                }
              >
                <a href={download.href} download={download.filename}>
                  <Download className="mr-1.5 size-4" />
                  <span className="hidden sm:inline">Download</span>
                  {sizeLabel && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {sizeLabel}
                    </span>
                  )}
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={close}>
              Close
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-black">
          <div className="absolute inset-0">
            <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
              <Viewer item={activeItem} sceneId={config.id} />
            </Suspense>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
