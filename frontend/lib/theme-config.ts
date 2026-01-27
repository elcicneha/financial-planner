/**
 * SINGLE SOURCE OF TRUTH FOR THEME CONFIGURATION
 *
 * To add a new theme:
 * 1. Add the theme to this config object
 * 2. Add the CSS definitions in app/globals.css (with both light and dark modes)
 *
 * That's it! No need to manually update useTheme.ts or layout.tsx
 */

export const THEME_CONFIG = {
  default: {
    label: 'Default',
    description: 'Warm and welcoming design with rounded corners',
  },
  lime: {
    label: 'Lime',
    description: 'Modern and bold with vibrant colors',
  },
} as const;

/**
 * Type-safe theme names derived from config
 */
export type Theme = keyof typeof THEME_CONFIG;

/**
 * Array of valid theme names for validation
 */
export const VALID_THEMES = Object.keys(THEME_CONFIG) as Theme[];

/**
 * Theme metadata for UI display
 */
export const themeMetadata = THEME_CONFIG;

/**
 * Generates the inline script for preventing flash of unstyled content
 * Used in app/layout.tsx
 */
export function generateThemeScript() {
  const validThemes = VALID_THEMES;
  const validModes = ['light', 'dark'];

  return `
    (function() {
      try {
        const validThemes = ${JSON.stringify(validThemes)};
        const validModes = ${JSON.stringify(validModes)};

        const theme = localStorage.getItem('theme') || 'default';
        const mode = localStorage.getItem('mode') || 'light';

        if (validThemes.includes(theme)) {
          document.documentElement.setAttribute('data-theme', theme);
        } else {
          document.documentElement.setAttribute('data-theme', 'default');
        }

        if (validModes.includes(mode)) {
          document.documentElement.setAttribute('data-mode', mode);
        } else {
          document.documentElement.setAttribute('data-mode', 'light');
        }
      } catch (e) {}
    })();
  `.trim();
}
