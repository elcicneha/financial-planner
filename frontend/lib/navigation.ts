import { Upload, Sparkles, FileText, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  {
    title: 'Playground',
    href: '/playground',
    icon: Sparkles,
  },
  {
    title: 'Upload',
    href: '/upload',
    icon: Upload,
  },
  {
    title: 'ITR Prep',
    href: '/itr-prep',
    icon: FileText,
  },
  {
    title: 'Expenses',
    href: '/expenses',
    icon: Wallet,
  },
];
