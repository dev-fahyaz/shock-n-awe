'use client';

import type { SceneItemKind, ScenePreset, SiteKey } from './types';

/**
 * Scene analytics.
 *
 * Every event carries `sceneId` and never a slug, so renaming a URL does not
 * fracture a historical report.
 *
 * NOTE ON THE EXISTING BUG: the live NYC page loads both Google tags with a
 * literal `undefined` container id, because an unset NEXT_PUBLIC_* variable is
 * interpolated straight into the script URL. Never do that. Render no tag at
 * all when the id is missing — see `sites.ts`.
 */

export type SceneEvent =
  | { event: 'scene_view'; sceneId: string; site: SiteKey; preset: ScenePreset }
  | { event: 'scene_navigate'; from: string; to: string }
  | {
      event: 'scene_item_open';
      sceneId: string;
      itemId: string;
      kind: SceneItemKind;
    }
  | {
      event: 'scene_item_close';
      sceneId: string;
      itemId: string;
      dwellMs: number;
    }
  | { event: 'scene_page_turn'; sceneId: string; itemId: string; page: number }
  | {
      event: 'scene_media_progress';
      sceneId: string;
      itemId: string;
      pct: 25 | 50 | 75 | 100;
    }
  | { event: 'scene_download'; sceneId: string; itemId: string }
  | {
      event: 'scene_cta_click';
      sceneId: string;
      href: string;
      itemId?: string;
    }
  | {
      event: 'scene_lead_submit';
      sceneId: string;
      itemId: string;
      formId: string;
    };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const RECIPIENT_KEY = 'scene:recipient';
const RECIPIENT_FIELDS = 'scene:recipient-fields';

export function setRecipientId(id: string | null) {
  try {
    if (id) window.sessionStorage.setItem(RECIPIENT_KEY, id);
    else window.sessionStorage.removeItem(RECIPIENT_KEY);
  } catch {
    // Private browsing, blocked storage — personalisation degrades, nothing breaks.
  }
}

export function getRecipientId(): string | undefined {
  try {
    return window.sessionStorage.getItem(RECIPIENT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fields resolved from the `?r=` token, used for `{{firstName}}` style
 * substitution in letters and nameplates.
 *
 * Only ever populated by the server's response to the token — never read from
 * the query string directly. A name in a URL leaks the moment the link is
 * forwarded or pasted into a channel.
 */
export function setRecipientFields(fields: Record<string, string>) {
  try {
    window.sessionStorage.setItem(RECIPIENT_FIELDS, JSON.stringify(fields));
  } catch {
    /* ignore */
  }
}

export function getRecipientName(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(RECIPIENT_FIELDS);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Events worth waking the CRM for. */
const HIGH_INTENT: ReadonlySet<SceneEvent['event']> = new Set([
  'scene_download',
  'scene_lead_submit',
  'scene_cta_click',
]);

/**
 * Events that fire immediately before the page unloads.
 *
 * A same-tab redirect tears the document down straight after the click, so an
 * ordinary XHR is cancelled and even the GTM tag may not flush in time.
 * `sendBeacon` is the only transport the browser guarantees to deliver across
 * a navigation — without it, every outbound click on a scene is invisible.
 */
const UNLOAD_RISK: ReadonlySet<SceneEvent['event']> = new Set([
  'scene_cta_click',
  'scene_download',
  'scene_navigate',
]);

export function track(e: SceneEvent) {
  if (typeof window === 'undefined') return;

  const payload = { ...e, recipient: getRecipientId() };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);

  const beacon =
    UNLOAD_RISK.has(e.event) || (HIGH_INTENT.has(e.event) && getRecipientId());

  if (beacon) {
    try {
      navigator.sendBeacon?.(
        '/api/scene/track',
        new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      );
    } catch {
      // Best-effort; the dataLayer push above already succeeded.
    }
  }
}
