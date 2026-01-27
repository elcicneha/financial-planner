'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
import { VALID_THEMES, type Theme } from '@/lib/theme-config';

/**
 * Re-export Theme type for convenience
 */
export type { Theme } from '@/lib/theme-config';

/**
 * Available color modes
 */
export type Mode = 'light' | 'dark';

const VALID_MODES: Mode[] = ['light', 'dark'];

const THEME_STORAGE_KEY = 'theme';
const MODE_STORAGE_KEY = 'mode';

/**
 * Unified theme hook that manages both theme and mode
 *
 * Features:
 * - Independent theme (design system) and mode (light/dark) controls
 * - Persists to localStorage
 * - Updates data-theme and data-mode attributes on document root
 * - No flash on initial load (handled by inline script in layout)
 *
 * Usage:
 * ```tsx
 * const { theme, mode, setTheme, setMode } = useTheme();
 * setTheme('neo');
 * setMode('dark');
 * ```
 */
export function useTheme() {
  // Always initialize to 'default' to avoid hydration mismatches
  // The blocking script in layout.tsx will have already set the DOM attributes
  const [theme, setThemeState] = useState<Theme>('default');
  const [mode, setModeState] = useState<Mode>('light');

  // Sync with DOM (set by blocking script) before React renders
  // This runs before browser paint, ensuring state matches DOM
  useLayoutEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') as Theme;
    const currentMode = document.documentElement.getAttribute('data-mode') as Mode;

    if (currentTheme && VALID_THEMES.includes(currentTheme)) {
      setThemeState(currentTheme);
    }

    if (currentMode && VALID_MODES.includes(currentMode)) {
      setModeState(currentMode);
    }
  }, []);

  /**
   * Set the color theme (design system)
   */
  const setTheme = useCallback((newTheme: Theme) => {
    if (!VALID_THEMES.includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}. Valid themes: ${VALID_THEMES.join(', ')}`);
      return;
    }

    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  /**
   * Set the color mode (light/dark)
   */
  const setMode = useCallback((newMode: Mode) => {
    if (!VALID_MODES.includes(newMode)) {
      console.warn(`Invalid mode: ${newMode}. Valid modes: ${VALID_MODES.join(', ')}`);
      return;
    }

    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
    document.documentElement.setAttribute('data-mode', newMode);
  }, []);

  /**
   * Toggle between light and dark mode
   */
  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  return {
    theme,
    mode,
    setTheme,
    setMode,
    toggleMode,
  };
}
