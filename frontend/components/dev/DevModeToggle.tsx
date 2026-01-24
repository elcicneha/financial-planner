'use client';

import { Code2 } from 'lucide-react';
import { useDevMode } from './DevModeProvider';

export function DevModeToggle() {
  const { isDevMode, toggleDevMode } = useDevMode();

  return (
    <button
      onClick={toggleDevMode}
      className={`fixed bottom-4 right-4 z-50 p-2 rounded-full transition-all duration-200 shadow-lg hover:scale-105 ${
        isDevMode
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/80 text-muted-foreground hover:bg-muted'
      }`}
      title={isDevMode ? 'Hide dev tools' : 'Show dev tools'}
    >
      <Code2 className="h-4 w-4" />
    </button>
  );
}
