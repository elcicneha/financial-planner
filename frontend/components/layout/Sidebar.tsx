'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from '@/lib/navigation';
import { useDevMode } from '@/components/dev/DevModeProvider';

export function Sidebar() {
  const pathname = usePathname();
  const { isDevMode, toggleDevMode } = useDevMode();

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
      <div className="p-3 border-t border-border/50">
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
