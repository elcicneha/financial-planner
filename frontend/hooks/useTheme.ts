'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Available color themes (design systems)
 */
export type Theme = 'default' | 'neo' | 'ocean';

/**
 * Available color modes
 */
export type Mode = 'light' | 'dark';

const VALID_THEMES: Theme[] = ['default', 'neo'];
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
  // Initialize from DOM (set by blocking script) to avoid hydration mismatch
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'default';
    const currentTheme = document.documentElement.getAttribute('data-theme') as Theme;
    return currentTheme && VALID_THEMES.includes(currentTheme) ? currentTheme : 'default';
  });

  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'light';
    const currentMode = document.documentElement.getAttribute('data-mode') as Mode;
    return currentMode && VALID_MODES.includes(currentMode) ? currentMode : 'light';
  });

  // Sync with localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as Mode | null;

    if (savedTheme && VALID_THEMES.includes(savedTheme) && savedTheme !== theme) {
      setThemeState(savedTheme);
    }

    if (savedMode && VALID_MODES.includes(savedMode) && savedMode !== mode) {
      setModeState(savedMode);
    }
  }, [theme, mode]);

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

/**
 * Theme metadata for UI display
 */
export const themeMetadata: Record<Theme, { label: string; description: string }> = {
  default: {
    label: 'Default',
    description: 'Warm and welcoming design with rounded corners',
  },
  neo: {
    label: 'Neo',
    description: 'Modern and bold with vibrant colors',
  },
  ocean: {
    label: 'Ocean',
    description: 'Calm and professional with blue tones',
  },
};
