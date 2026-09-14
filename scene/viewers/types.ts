import type { ComponentType } from 'react';

import type { ResolvedItem } from '../types';

export interface ViewerProps {
  item: ResolvedItem;
  sceneId: string;
}

export type ViewerComponent = ComponentType<ViewerProps>;
