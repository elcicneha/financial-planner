'use client';

import { ReactNode } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { ITRPrepProvider, useITRPrep } from './context/ITRPrepContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function FYSelector() {
  const { selectedFY, setSelectedFY, availableFYs, fyLoading } = useITRPrep();

  return (
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
  );
}

function ITRPrepLayoutContent({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Header with Tab Navigation and FY Selector */}
      <div className="flex items-center gap-6 pb-2">
        <div className="w-full">
          <TabNavigation />
        </div>
        <FYSelector />
      </div>

      {/* Tab Content */}
      {children}
    </>
  );
}

export default function ITRPrepLayout({ children }: { children: ReactNode }) {
  return (
    <ITRPrepProvider>
      <ITRPrepLayoutContent>{children}</ITRPrepLayoutContent>
    </ITRPrepProvider>
  );
}
