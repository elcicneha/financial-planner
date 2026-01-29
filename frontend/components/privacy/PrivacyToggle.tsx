'use client';

import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from './PrivacyProvider';
import { Button } from '@/components/ui/button';
import { Slot } from '@radix-ui/react-slot';
import { useEffect } from 'react';
import { PRIVACY_KEYBOARD_SHORTCUT } from '@/lib/privacy';

interface PrivacyToggleProps {
  asChild?: boolean;
  className?: string;
}

export function PrivacyToggle({ asChild, className }: PrivacyToggleProps) {
  const { isHidden, toggleHidden } = usePrivacy();
  const Comp = asChild ? Slot : Button;

  // Keyboard shortcut for privacy toggle (configurable in lib/privacy.ts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const config = PRIVACY_KEYBOARD_SHORTCUT;

      // Check if the configured key combination is pressed
      if (
        e.key.toLowerCase() === config.key.toLowerCase() &&
        e.metaKey === config.metaKey &&
        e.ctrlKey === config.ctrlKey &&
        e.altKey === config.altKey &&
        e.shiftKey === config.shiftKey
      ) {
        const target = e.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        // Only trigger if not typing in an input field
        if (!isInputField) {
          e.preventDefault();
          toggleHidden();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleHidden]);

  return (
    <Comp
      variant={isHidden ? "secondary" : "default"}
      size="icon"
      className={className}
      onClick={toggleHidden}
      title={`${isHidden ? 'Show' : 'Hide'} sensitive values (${PRIVACY_KEYBOARD_SHORTCUT.displayLabel})`}
    >
      <EyeOff className="size-4 rotate-0 scale-100 transition-all data-[hidden=true]:rotate-90 data-[hidden=true]:scale-0" data-hidden={isHidden} />
      <Eye className="absolute size-4 rotate-90 scale-0 transition-all data-[hidden=true]:rotate-0 data-[hidden=true]:scale-100" data-hidden={isHidden} />
      <span className="sr-only">Toggle privacy mode</span>
    </Comp>
  );
}
