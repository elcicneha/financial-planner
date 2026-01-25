import { DesignCurrent } from './DesignCurrent';
import { PlaygroundState } from '@/hooks/usePlaygroundState';
import { ComponentType } from 'react';

export interface DesignEntry {
  name: string;
  component: ComponentType<{ state: PlaygroundState }>;
}

export const designs: Record<string, DesignEntry> = {
  current: { name: 'Current', component: DesignCurrent },
  // Add more designs here:
  // variantA: { name: 'Variant A', component: DesignVariantA },
  // variantB: { name: 'Variant B', component: DesignVariantB },
};

export const designKeys = Object.keys(designs);
export const defaultDesign = 'current';
