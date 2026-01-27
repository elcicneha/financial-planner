'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { themes, defaultTheme, type ThemeName } from '@/lib/themes';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'app-theme';

/**
 * ThemeProvider - Manages theme state and applies CSS variables
 *
 * Features:
 * - Lazy initialization from localStorage
 * - Memoized callbacks to prevent re-renders
 * - Batched DOM updates via requestAnimationFrame
 * - SSR-safe
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initialization: read localStorage only once on mount
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    return (saved && themes[saved]) ? saved : defaultTheme;
  });

  // Memoized callback to prevent unnecessary re-renders
  const setTheme = useCallback((newTheme: ThemeName) => {
    if (!themes[newTheme]) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }

    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, []);

  // Apply initial theme on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Apply theme CSS variables to the document root
 * Uses requestAnimationFrame to batch DOM updates for better performance
 */
function applyTheme(themeName: ThemeName) {
  const themeConfig = themes[themeName];
  if (!themeConfig) return;

  const root = document.documentElement;

  // Batch style updates using requestAnimationFrame for better performance
  requestAnimationFrame(() => {
    Object.entries(themeConfig.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  });
}

/**
 * Hook to access theme context
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
