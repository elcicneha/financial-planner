'use client';

import { useTheme } from '@/hooks/useTheme';
import { themeMetadata, type Theme } from '@/lib/theme-config';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Combined theme switcher component
 *
 * Features:
 * - Tabs component for theme (design system) selection
 * - ThemeToggle button for light/dark mode
 *
 * Usage:
 * ```tsx
 * <ThemeSwitcher />
 * ```
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground px-1">
        Theme
      </label>
      <div className="flex gap-2">
        <Tabs value={theme} onValueChange={(value) => setTheme(value as Theme)} className="flex-1">
          <TabsList className="w-full">
            {Object.entries(themeMetadata).map(([key, meta]) => (
              <TabsTrigger key={key} value={key}>
                {meta.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ThemeToggle className="size-9 shrink-0" />
      </div>
    </div>
  );
}
