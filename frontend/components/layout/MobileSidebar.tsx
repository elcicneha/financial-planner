'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, TrendingUp, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isDevMode, toggleDevMode } = useDevMode();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-56 p-0 border-border/50 bg-background">
        <SheetHeader className="h-16 flex flex-row items-center px-5 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <SheetTitle className="font-display font-semibold text-sm">
              Financial Planner
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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

        <div className="p-3 border-t border-border/50 mt-auto space-y-3">
          {/* Theme Selector with Mode Toggle */}
          <ThemeSwitcher />

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
      </SheetContent>
    </Sheet>
  );
}
