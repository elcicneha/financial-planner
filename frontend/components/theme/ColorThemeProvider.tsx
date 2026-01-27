'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * Available color themes (design systems)
 * Each theme has its own personality: colors, radius, fonts, etc.
 */
export type ColorTheme = 'default' | 'neo' | 'ocean';

/**
 * Array of valid color themes - single source of truth
 * Used for validation and in blocking script
 */
export const VALID_COLOR_THEMES: ColorTheme[] = ['default', 'neo', 'ocean'];

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
 *
 * NOTE: The blocking script in layout.tsx sets data-theme before React hydrates,
 * so we read from DOM on mount to match the server-rendered HTML
 */
export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with a function to avoid hydration mismatch
  // This reads the data-theme attribute that was set by the blocking script
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    // During SSR, return default
    if (typeof window === 'undefined') return 'default';

    // On client, read from DOM (set by blocking script)
    const currentTheme = document.documentElement.getAttribute('data-theme') as ColorTheme;
    return currentTheme && VALID_COLOR_THEMES.includes(currentTheme) ? currentTheme : 'default';
  });

  // No longer needed - blocking script handles initial render
  // Just keep state in sync with localStorage for future updates
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (saved && VALID_COLOR_THEMES.includes(saved) && saved !== colorTheme) {
      setColorThemeState(saved);
    }
  }, [colorTheme]);

  // Memoized callback to prevent unnecessary re-renders
  const setColorTheme = useCallback((newTheme: ColorTheme) => {
    if (!VALID_COLOR_THEMES.includes(newTheme)) {
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
