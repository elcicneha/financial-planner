'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Slot } from '@radix-ui/react-slot';

interface ThemeToggleProps {
  asChild?: boolean;
  className?: string;
}

export function ThemeToggle({ asChild, className }: ThemeToggleProps) {
  const { toggleMode } = useTheme();
  const Comp = asChild ? Slot : Button;

  return (
    <Comp
      variant="secondary"
      size="icon"
      className={className}
      onClick={toggleMode}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme mode</span>
    </Comp>
  );
}
