'use client';

import { useEffect } from 'react';
import { designs, designKeys } from '../designs';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { EmptyDefaultsToggle } from '@/components/dev/EmptyDefaultsToggle';

interface DesignSwitcherProps {
  selected: string;
  onChange: (design: string) => void;
}

export function DesignSwitcher({ selected, onChange }: DesignSwitcherProps) {
  const { isDevMode } = useDevMode();

  // Keyboard shortcuts (1, 2, 3, etc.)
  useEffect(() => {
    if (!isDevMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= designKeys.length) {
        onChange(designKeys[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDevMode, onChange]);

  if (!isDevMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Design
        </span>
        <div className="flex gap-1">
          {designKeys.map((key, index) => {
            const design = designs[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => onChange(key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-xs opacity-60 mr-1.5">{index + 1}</span>
                {design.name}
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <EmptyDefaultsToggle />
        </div>
      </div>
    </div>
  );
}
