'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

// Shared type for category data (works for both CAS and FIFO)
export interface CategoryData {
  sale_consideration: number;
  acquisition_cost: number;
  gain_loss: number;
}

// Compact data row - click anywhere to copy
export function DataRow({ label, value, isGain }: {
  label: string;
  value: number;
  isGain?: boolean;
}) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    const rounded = Math.abs(value).toFixed(4);
    navigator.clipboard.writeText(rounded);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const colorClass = isGain
    ? value >= 0
      ? 'text-success'
      : 'text-destructive'
    : '';

  return (
    <div
      onClick={handleCopy}
      className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded cursor-pointer group hover:bg-muted/50 transition-colors"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`font-mono text-sm tabular-nums ${colorClass}`}>
          {formatCurrency(value)}
        </span>
        <span className="text-accent-foreground w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
          {hasCopied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
        </span>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  title: string;
  subtitle: string;
  data: CategoryData;
}

export function CategoryCard({ title, subtitle, data }: CategoryCardProps) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/40">
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      <div className="px-4 py-2">
        <DataRow label="Sale Consideration" value={data.sale_consideration} />
        <DataRow label="Acquisition Cost" value={data.acquisition_cost} />
        <div className="border-t my-1" />
        <DataRow label="Gain/Loss" value={data.gain_loss} isGain />
      </div>
    </div>
  );
}
