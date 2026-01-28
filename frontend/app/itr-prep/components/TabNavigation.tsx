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
              className={cn(
                // Base styles (matching TabsTrigger from tabs.tsx)
                'relative inline-flex h-[calc(100%-1px)] items-center justify-center px-3 py-1 text-sm font-medium whitespace-nowrap transition-all rounded-md',
                // Default state
                'text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground',
                // Focus styles
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                // Active state
                isActive && 'text-foreground dark:text-foreground',
                // Underline indicator (line variant style)
                'after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity',
                isActive && 'after:opacity-100'
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
