/**
 * Theme System Configuration
 *
 * Defines all available themes with RGB color values.
 * To create a new theme: copy an existing theme object and modify the RGB values.
 */

/**
 * Available theme names in the application
 */
export type ThemeName = 'base-light' | 'dark' | 'neo-light';

/**
 * CSS variable values in RGB format (without rgb() wrapper)
 * Example: '247 240 237' for rgb(247, 240, 237)
 */
interface ThemeVariables {
  // Core
  '--background': string;
  '--foreground': string;

  // Surfaces
  '--card': string;
  '--card-foreground': string;
  '--popover': string;
  '--popover-foreground': string;

  // Brand
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;

  // UI States
  '--muted': string;
  '--muted-foreground': string;
  '--accent': string;
  '--accent-foreground': string;

  // Status
  '--success': string;
  '--success-foreground': string;
  '--success-muted': string;
  '--warning': string;
  '--warning-foreground': string;
  '--warning-muted': string;
  '--destructive': string;
  '--destructive-foreground': string;
  '--destructive-muted': string;

  // UI Elements
  '--border': string;
  '--input': string;
  '--ring': string;

  // Sidebar
  '--sidebar': string;
  '--sidebar-foreground': string;
  '--sidebar-border': string;
  '--sidebar-accent': string;

  // Non-color (border radius)
  '--radius': string;
}

/**
 * Theme configuration object
 */
export interface Theme {
  readonly name: ThemeName;
  readonly label: string;
  readonly variables: Readonly<ThemeVariables>;
}

/**
 * All available themes
 * Frozen for immutability and performance
 */
export const themes: Readonly<Record<ThemeName, Theme>> = Object.freeze({
  'base-light': {
    name: 'base-light',
    label: 'Base Light',
    variables: {
      // Core
      '--background': '250 247 242',
      '--foreground': '37 37 44',

      // Surfaces
      '--card': '255 255 255',
      '--card-foreground': '37 37 44',
      '--popover': '255 255 255',
      '--popover-foreground': '37 37 44',

      // Brand - Warm coral
      '--primary': '236 98 45',
      '--primary-foreground': '255 255 255',

      // Secondary - Soft sage
      '--secondary': '233 245 240',
      '--secondary-foreground': '46 107 84',

      // Muted - Warm gray
      '--muted': '243 240 233',
      '--muted-foreground': '112 112 118',

      // Accent - Soft lavender
      '--accent': '245 238 252',
      '--accent-foreground': '107 54 143',

      // Status colors
      '--success': '43 171 126',
      '--success-foreground': '255 255 255',
      '--success-muted': '233 245 240',
      '--warning': '245 158 10',
      '--warning-foreground': '74 48 3',
      '--warning-muted': '252 240 220',
      '--destructive': '220 38 38',
      '--destructive-foreground': '255 255 255',
      '--destructive-muted': '252 237 237',

      // UI Elements
      '--border': '232 227 217',
      '--input': '232 227 217',
      '--ring': '236 98 45',

      // Sidebar
      '--sidebar': '255 255 255',
      '--sidebar-foreground': '37 37 44',
      '--sidebar-border': '237 232 222',
      '--sidebar-accent': '236 98 45',

      // Border radius
      '--radius': '0.75rem',
    }
  },

  'dark': {
    name: 'dark',
    label: 'Dark',
    variables: {
      // Core
      '--background': '14 14 16',
      '--foreground': '242 239 234',

      // Surfaces
      '--card': '21 21 24',
      '--card-foreground': '242 239 234',
      '--popover': '21 21 24',
      '--popover-foreground': '242 239 234',

      // Brand - Lighter coral for dark mode
      '--primary': '235 107 61',
      '--primary-foreground': '255 255 255',

      // Secondary - Darker sage
      '--secondary': '31 48 42',
      '--secondary-foreground': '193 224 213',

      // Muted - Dark gray
      '--muted': '33 33 38',
      '--muted-foreground': '145 145 153',

      // Accent - Darker lavender
      '--accent': '37 35 57',
      '--accent-foreground': '209 193 224',

      // Status colors
      '--success': '51 179 134',
      '--success-foreground': '255 255 255',
      '--success-muted': '27 44 38',
      '--warning': '240 146 13',
      '--warning-foreground': '31 19 3',
      '--warning-muted': '50 38 24',
      '--destructive': '204 51 51',
      '--destructive-foreground': '255 255 255',
      '--destructive-muted': '54 23 23',

      // UI Elements
      '--border': '38 38 43',
      '--input': '38 38 43',
      '--ring': '235 107 61',

      // Sidebar
      '--sidebar': '16 16 19',
      '--sidebar-foreground': '242 239 234',
      '--sidebar-border': '28 28 33',
      '--sidebar-accent': '235 107 61',

      // Border radius
      '--radius': '0.75rem',
    }
  },

  'neo-light': {
    name: 'neo-light',
    label: 'Neo Light',
    variables: {
      // Start with base-light values - user will customize
      '--background': '250 247 242',
      '--foreground': '37 37 44',
      '--card': '255 255 255',
      '--card-foreground': '37 37 44',
      '--popover': '255 255 255',
      '--popover-foreground': '37 37 44',
      '--primary': '236 98 45',
      '--primary-foreground': '255 255 255',
      '--secondary': '233 245 240',
      '--secondary-foreground': '46 107 84',
      '--muted': '243 240 233',
      '--muted-foreground': '112 112 118',
      '--accent': '245 238 252',
      '--accent-foreground': '107 54 143',
      '--success': '43 171 126',
      '--success-foreground': '255 255 255',
      '--success-muted': '233 245 240',
      '--warning': '245 158 10',
      '--warning-foreground': '74 48 3',
      '--warning-muted': '252 240 220',
      '--destructive': '220 38 38',
      '--destructive-foreground': '255 255 255',
      '--destructive-muted': '252 237 237',
      '--border': '232 227 217',
      '--input': '232 227 217',
      '--ring': '236 98 45',
      '--sidebar': '255 255 255',
      '--sidebar-foreground': '37 37 44',
      '--sidebar-border': '237 232 222',
      '--sidebar-accent': '236 98 45',
      '--radius': '0.75rem',
    }
  }
} as const);

/**
 * Default theme on first visit
 */
export const defaultTheme: ThemeName = 'base-light';

/**
 * Get theme by name with type safety
 */
export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

/**
 * Get all theme names for iteration
 */
export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[];
}
