'use client';

import { useState, useEffect, useMemo } from 'react';
import { VariantSwitcher } from '@/components/VariantSwitcher';
import { variants, defaultVariant, variantKeys } from './variants';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { useAvailableFinancialYears } from '@/hooks/useAvailableFinancialYears';
import { useCASFiles } from '@/hooks/useCASFiles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_KEY = 'itr-prep-variant';
const FY_STORAGE_KEY = 'itr-prep-global-fy';

export default function ITRPrepPage() {
  const { isDevMode } = useDevMode();
  const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
  const [selectedFY, setSelectedFY] = useState<string>('');
  const [mounted, setMounted] = useState(false);

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

  // Load saved variant and FY from localStorage
  useEffect(() => {
    const storedVariant = localStorage.getItem(STORAGE_KEY);
    if (storedVariant && variantKeys.includes(storedVariant)) {
      setSelectedVariant(storedVariant);
    }
    setMounted(true);
  }, []);

  // Initialize FY selection
  useEffect(() => {
    if (mounted && !fyLoading && availableFYs.length > 0 && !selectedFY) {
      const storedFY = localStorage.getItem(FY_STORAGE_KEY);
      if (storedFY && availableFYs.includes(storedFY)) {
        setSelectedFY(storedFY);
      } else {
        // Default to most recent FY
        setSelectedFY(availableFYs[0]);
      }
    }
  }, [mounted, fyLoading, availableFYs, selectedFY]);

  // Save variant selection to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, selectedVariant);
    }
  }, [selectedVariant, mounted]);

  // Save FY selection to localStorage
  useEffect(() => {
    if (mounted && selectedFY) {
      localStorage.setItem(FY_STORAGE_KEY, selectedFY);
    }
  }, [selectedFY, mounted]);

  // Get selected variant component
  const SelectedComponent = variants[selectedVariant]?.component ?? variants[defaultVariant].component;

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
