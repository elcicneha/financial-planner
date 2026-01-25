'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DevModeContextValue {
  isDevMode: boolean;
  toggleDevMode: () => void;
  useEmptyDefaults: boolean;
  toggleEmptyDefaults: () => void;
}

const DevModeContext = createContext<DevModeContextValue | null>(null);

const STORAGE_KEY = 'dev-mode-enabled';
const STORAGE_KEY_EMPTY_DEFAULTS = 'dev-mode-use-empty-defaults';

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [useEmptyDefaults, setUseEmptyDefaults] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedEmpty = localStorage.getItem(STORAGE_KEY_EMPTY_DEFAULTS);

    if (stored === 'true') {
      setIsDevMode(true);
    }
    if (storedEmpty === 'true') {
      setUseEmptyDefaults(true);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isDevMode));
      localStorage.setItem(STORAGE_KEY_EMPTY_DEFAULTS, String(useEmptyDefaults));
    }
  }, [isDevMode, useEmptyDefaults, mounted]);

  const toggleDevMode = () => setIsDevMode((prev) => !prev);
  const toggleEmptyDefaults = () => setUseEmptyDefaults((prev) => !prev);

  return (
    <DevModeContext.Provider
      value={{
        isDevMode,
        toggleDevMode,
        useEmptyDefaults,
        toggleEmptyDefaults,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  // Return default values if context is not available (SSR or outside provider)
  if (!context) {
    return {
      isDevMode: false,
      toggleDevMode: () => {},
      useEmptyDefaults: false,
      toggleEmptyDefaults: () => {},
    };
  }
  return context;
}
