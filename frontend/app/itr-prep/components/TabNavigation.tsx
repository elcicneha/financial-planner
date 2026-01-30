'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface Tab {
  key: string;
  label: string;
  href: string;
}

export const tabs: Tab[] = [
  { key: 'other-info', label: 'Other Info', href: '/itr-prep/other-info' },
  { key: 'cas-statement', label: 'CAS Statement', href: '/itr-prep/cas-statement' },
  { key: 'capital-gains', label: 'My Calculations', href: '/itr-prep/capital-gains' },
];

export const defaultTab = tabs[0];

export function TabNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <nav className="inline-flex h-9 items-center gap-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.key}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              prefetch={true}
              data-state={isActive ? 'active' : 'inactive'}
              className={cn(
                // Base styles
                'cursor-pointer text-muted-foreground hover:text-foreground',
                'relative inline-flex h-full items-center justify-center px-3 py-1 text-sm font-medium whitespace-nowrap transition-all',
                // Focus styles
                'focus-ring',
                // Active state
                'data-[state=active]:text-foreground',
                // Underline indicator - positioned to overlap the border
                'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-primary after:opacity-0 after:transition-opacity',
                'data-[state=active]:after:opacity-100'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
