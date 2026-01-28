'use client';

import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAvailableFinancialYears } from '@/hooks/useAvailableFinancialYears';
import { useCASFiles } from '@/hooks/useCASFiles';

interface ITRPrepContextValue {
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  availableFYs: string[];
  fyLoading: boolean;
}

const ITRPrepContext = createContext<ITRPrepContextValue | null>(null);

export function ITRPrepProvider({ children }: { children: ReactNode }) {
  const [selectedFY, setSelectedFY, mounted] = useLocalStorage<string>('itr-prep-global-fy', '');

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

  const fyLoading = fifoLoading || casLoading || !mounted;

  // Initialize FY selection with most recent if stored value is invalid
  useEffect(() => {
    if (mounted && !fyLoading && availableFYs.length > 0) {
      if (!selectedFY || !availableFYs.includes(selectedFY)) {
        setSelectedFY(availableFYs[0]);
      }
    }
  }, [mounted, fyLoading, availableFYs, selectedFY, setSelectedFY]);

  const value = useMemo(
    () => ({
      selectedFY,
      setSelectedFY,
      availableFYs,
      fyLoading,
    }),
    [selectedFY, setSelectedFY, availableFYs, fyLoading]
  );

  return (
    <ITRPrepContext.Provider value={value}>
      {children}
    </ITRPrepContext.Provider>
  );
}

export function useITRPrep() {
  const context = useContext(ITRPrepContext);
  if (!context) {
    throw new Error('useITRPrep must be used within an ITRPrepProvider');
  }
  return context;
}
