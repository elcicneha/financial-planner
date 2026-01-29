'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReplacementMode, REPLACEMENT_OPTIONS } from '@/lib/privacy';

interface PrivacyContextValue {
  isHidden: boolean;
  toggleHidden: () => void;
  replacementMode: ReplacementMode;
  setReplacementMode: (mode: ReplacementMode) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

const STORAGE_KEY_HIDDEN = 'privacy-is-hidden';
const STORAGE_KEY_MODE = 'privacy-replacement-mode';

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);
  const [replacementMode, setReplacementModeState] = useState<ReplacementMode>(
    REPLACEMENT_OPTIONS[0].value
  );
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedHidden = localStorage.getItem(STORAGE_KEY_HIDDEN);
    const storedMode = localStorage.getItem(STORAGE_KEY_MODE);

    if (storedHidden === 'true') {
      setIsHidden(true);
    }

    // Validate stored mode against available options
    const validMode = REPLACEMENT_OPTIONS.find((opt) => opt.value === storedMode);
    if (validMode) {
      setReplacementModeState(validMode.value);
    }

    setMounted(true);
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY_HIDDEN, String(isHidden));
      localStorage.setItem(STORAGE_KEY_MODE, replacementMode);
    }
  }, [isHidden, replacementMode, mounted]);

  const toggleHidden = () => setIsHidden((prev) => !prev);

  const setReplacementMode = (mode: ReplacementMode) => {
    setReplacementModeState(mode);
  };

  return (
    <PrivacyContext.Provider
      value={{
        isHidden,
        toggleHidden,
        replacementMode,
        setReplacementMode,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  // Return default values if context is not available (SSR or outside provider)
  if (!context) {
    return {
      isHidden: false,
      toggleHidden: () => {},
      replacementMode: REPLACEMENT_OPTIONS[0].value as ReplacementMode,
      setReplacementMode: () => {},
    };
  }
  return context;
}
