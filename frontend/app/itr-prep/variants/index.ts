import VariantFIFO from './VariantFIFO';
import VariantCAS from './VariantCAS';
import { ComponentType } from 'react';

export interface VariantEntry {
  name: string;
  component: ComponentType;
}

export const variants: Record<string, VariantEntry> = {
  cas: { name: 'CAS Statement', component: VariantCAS },
  fifo: { name: 'FIFO Calculations', component: VariantFIFO },
};

export const variantKeys = Object.keys(variants);
export const defaultVariant = 'cas';
