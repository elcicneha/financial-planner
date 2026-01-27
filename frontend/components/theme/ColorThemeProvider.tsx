'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * Available color themes (design systems)
 * Each theme has its own personality: colors, radius, fonts, etc.
 */
export type ColorTheme = 'default' | 'neo' | 'ocean';

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'color-theme';

/**
 * ColorThemeProvider - Manages data-theme attribute
 *
 * This provider handles the design system theme (colors, radius, fonts, animations)
 * Separate from dark/light mode which is handled by next-themes
 */
export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with default theme (no localStorage read during SSR)
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('default');

  // Hydration-safe initialization
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (saved && ['default', 'neo', 'ocean'].includes(saved)) {
      setColorThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'default');
    }
  }, []);

  // Memoized callback to prevent unnecessary re-renders
  const setColorTheme = useCallback((newTheme: ColorTheme) => {
    if (!['default', 'neo', 'ocean'].includes(newTheme)) {
      console.warn(`Invalid color theme: ${newTheme}`);
      return;
    }

    setColorThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ colorTheme, setColorTheme }), [colorTheme, setColorTheme]);

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}

/**
 * Hook to access color theme context
 * @throws Error if used outside ColorThemeProvider
 */
export function useColorTheme(): ColorThemeContextType {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error('useColorTheme must be used within ColorThemeProvider');
  }
  return context;
}

/**
 * Theme metadata for UI display
 */
export const colorThemes: Record<ColorTheme, { label: string; description: string }> = {
  default: {
    label: 'Default',
    description: 'Warm and welcoming design with rounded corners'
  },
  neo: {
    label: 'Neo',
    description: 'Modern and bold with vibrant colors'
  },
  ocean: {
    label: 'Ocean',
    description: 'Calm and professional with blue tones'
  }
};
