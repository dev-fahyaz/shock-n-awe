import type { ReactNode } from 'react';

import { cn } from 'components/ui/utils';

export type DeviceKind = 'phone' | 'tablet' | 'monitor';

/**
 * Hardware around a screen. `fill` stretches to the parent box (a desk hotspot
 * or a sized modal slot). The screen is the containing block for its content.
 */
export function DeviceFrame({
  kind,
  children,
  className,
  fill = false,
}: {
  kind: DeviceKind;
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        'scene-device',
        `scene-device--${kind}`,
        fill && 'scene-device--fill',
        className,
      )}
    >
      {kind === 'phone' ? (
        <span className="scene-device-ear" aria-hidden />
      ) : (
        <span className="scene-device-camera" aria-hidden />
      )}
      <div className="scene-device-screen">{children}</div>
      {kind === 'phone' && <span className="scene-device-bar" aria-hidden />}
      {kind === 'monitor' && <span className="scene-device-stand" aria-hidden />}
    </div>
  );
}
