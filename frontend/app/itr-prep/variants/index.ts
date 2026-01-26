import VariantFIFO from './VariantFIFO';
import VariantCAS from './VariantCAS';
import VariantOtherInfo from './VariantOtherInfo';
import { ComponentType } from 'react';

export interface VariantEntry {
  name: string;
  component: ComponentType;
}

export const variants: Record<string, VariantEntry> = {
  cas: { name: 'CAS Statement', component: VariantCAS },
  fifo: { name: 'My Calculations', component: VariantFIFO },
  other: { name: 'Other Info', component: VariantOtherInfo },
};

export const variantKeys = Object.keys(variants);
export const defaultVariant = 'cas';
