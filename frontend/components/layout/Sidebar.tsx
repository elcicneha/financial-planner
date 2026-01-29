'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from '@/lib/navigation';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { PrivacySwitcher } from '@/components/privacy/PrivacySwitcher';

export function Sidebar() {
  const pathname = usePathname();
  const { isDevMode, toggleDevMode } = useDevMode();

  return (
    <div className="w-56 h-full border-r border-sidebar-border bg-sidebar flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary-muted flex items-center justify-center">
            <TrendingUp className="size-4 text-primary-muted-foreground" />
          </div>
          <span className="font-display font-semibold text-base">Financial Planner</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-muted/50'
              )}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-3">
        {/* Theme Selector with Mode Toggle */}
        <ThemeSwitcher />

        {/* Privacy Controls */}
        <PrivacySwitcher />

        {/* Dev Mode Toggle */}
        <button
          onClick={toggleDevMode}
          className={cn(
            'cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full',
            isDevMode
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-accent-foreground hover:text-sidebar-accent-foreground hover:bg-muted/50'
          )}
          title={isDevMode ? 'Hide dev tools' : 'Show dev tools'}
        >
          <Code2 className="size-4" />
          Dev Mode
        </button>
      </div>
    </div>
  );
}
