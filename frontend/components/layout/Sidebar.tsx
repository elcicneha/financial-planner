'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from '@/lib/navigation';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import { themes, type ThemeName } from '@/lib/themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Sidebar() {
  const pathname = usePathname();
  const { isDevMode, toggleDevMode } = useDevMode();
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-56 h-full border-r border-border/50 bg-background flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-sm">Financial Planner</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-3">
        {/* Theme Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground px-1">
            Theme
          </label>
          <Select value={theme} onValueChange={(value) => setTheme(value as ThemeName)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(themes).map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dev Mode Toggle */}
        <button
          onClick={toggleDevMode}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full',
            isDevMode
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
          title={isDevMode ? 'Hide dev tools' : 'Show dev tools'}
        >
          <Code2 className="h-4 w-4" />
          Dev Mode
        </button>
      </div>
    </div>
  );
}
