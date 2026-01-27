'use client';

import { useTheme } from '@/hooks/useTheme';
import { themeMetadata, type Theme } from '@/lib/theme-config';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Combined theme switcher component
 *
 * Features:
 * - Select dropdown for theme (design system) selection
 * - ThemeToggle button for light/dark mode
 * - Maintains the same UI as before
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
        <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <SelectTrigger className="flex-1 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(themeMetadata).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ThemeToggle className="h-9 w-9 shrink-0" />
      </div>
    </div>
  );
}
