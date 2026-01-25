'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDevMode } from '@/components/dev/DevModeProvider';

interface VariantEntry {
  name: string;
}

interface VariantSwitcherProps<T extends string> {
  variants: Record<T, VariantEntry>;
  selected: T;
  onChange: (variant: T) => void;
  className?: string;
}

export function VariantSwitcher<T extends string>({
  variants,
  selected,
  onChange,
  className,
}: VariantSwitcherProps<T>) {
  const { isDevMode } = useDevMode();
  const variantKeys = Object.keys(variants) as T[];

  // Only show in dev mode
  if (!isDevMode) {
    return null;
  }

  return (
    <div className="top-0 left-0 right-0 border-b border-border">

      <Tabs value={selected} onValueChange={(value) => onChange(value as T)} className={className}>
        <TabsList variant="line">
          {variantKeys.map((key) => {
            const variant = variants[key];

            return (
              <TabsTrigger key={key} value={key}>
                {variant.name}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>

  );
}
