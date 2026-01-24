'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DevModeContextValue {
  isDevMode: boolean;
  toggleDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextValue | null>(null);

const STORAGE_KEY = 'dev-mode-enabled';

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsDevMode(true);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isDevMode));
    }
  }, [isDevMode, mounted]);

  const toggleDevMode = () => setIsDevMode((prev) => !prev);

  return (
    <DevModeContext.Provider value={{ isDevMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  // Return default values if context is not available (SSR or outside provider)
  if (!context) {
    return { isDevMode: false, toggleDevMode: () => {} };
  }
  return context;
}
