'use client';

import { useEffect, useMemo } from 'react';
import { VariantSwitcher } from '@/components/VariantSwitcher';
import { variants, defaultVariant, variantKeys } from './variants';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { useAvailableFinancialYears } from '@/hooks/useAvailableFinancialYears';
import { useCASFiles } from '@/hooks/useCASFiles';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ITRPrepPage() {
  const { isDevMode } = useDevMode();
  const [selectedVariant, setSelectedVariant, mounted] = useLocalStorage('itr-prep-variant', defaultVariant);
  const [selectedFY, setSelectedFY] = useLocalStorage<string>('itr-prep-global-fy', '');

  // Fetch available financial years from both sources
  const { financialYears: fifoYears, loading: fifoLoading } = useAvailableFinancialYears();
  const { files: casFiles, loading: casLoading } = useCASFiles();

  // Combine and deduplicate FYs from both sources
  const availableFYs = useMemo(() => {
    const casFYs = casFiles.map(f => f.financial_year);
    const uniqueFYs = new Set([...casFYs, ...fifoYears]);
    const allFYs = Array.from(uniqueFYs);
    // Sort in descending order (most recent first)
    return allFYs.sort((a, b) => b.localeCompare(a));
  }, [casFiles, fifoYears]);

  const fyLoading = fifoLoading || casLoading;

  // Validate stored variant on mount
  useEffect(() => {
    if (mounted && !variantKeys.includes(selectedVariant)) {
      setSelectedVariant(defaultVariant);
    }
  }, [mounted, selectedVariant, setSelectedVariant]);

  // Initialize FY selection with most recent if stored value is invalid
  useEffect(() => {
    if (mounted && !fyLoading && availableFYs.length > 0) {
      if (!selectedFY || !availableFYs.includes(selectedFY)) {
        setSelectedFY(availableFYs[0]);
      }
    }
  }, [mounted, fyLoading, availableFYs, selectedFY, setSelectedFY]);

  // Get selected variant component
  const SelectedComponent = variants[selectedVariant]?.component ?? variants[defaultVariant].component;

  // Don't render until mounted to prevent flash of wrong variant
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Flex container for Variant Switcher and FY Selector */}
      <div className={`flex items-center gap-6 ${isDevMode ? 'pb-2' : ''}`}>
        <div className='w-full'>
          <VariantSwitcher selected={selectedVariant} onChange={setSelectedVariant} variants={variants} />
        </div>
        {/* Global FY Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Period
          </span>
          <Select
            value={selectedFY}
            onValueChange={setSelectedFY}
            disabled={fyLoading || availableFYs.length === 0}
          >
            <SelectTrigger
              id="fy-select"
              className="w-[160px] font-mono text-xs font-medium tracking-wide"
            >
              <SelectValue placeholder={fyLoading ? "Loading..." : "Select FY"} />
            </SelectTrigger>
            <SelectContent>
              {availableFYs.map((fy) => (
                <SelectItem key={fy} value={fy} className="font-mono text-xs">
                  {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div >
      {/* <div className="mb-6 flex items-center gap-4">

          <label htmlFor="fy-select" className="text-sm font-medium">
            Financial Year:
          </label>
          <Select
            value={selectedFY}
            onValueChange={setSelectedFY}
            disabled={fyLoading || availableFYs.length === 0}
          >
            <SelectTrigger id="fy-select" className="w-[180px]">
              <SelectValue placeholder={fyLoading ? "Loading..." : "Select FY"} />
            </SelectTrigger>
            <SelectContent>
              {availableFYs.map((fy) => (
                <SelectItem key={fy} value={fy}>
                  {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}

      {/* Variant Content */}
      <SelectedComponent selectedFY={selectedFY} fyLoading={fyLoading} />

    </>
  );
}
