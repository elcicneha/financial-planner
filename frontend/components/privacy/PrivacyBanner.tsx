'use client';

import { usePrivacy } from './PrivacyProvider';
import { Eye, AlertCircle } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { PRIVACY_KEYBOARD_SHORTCUT } from '@/lib/privacy';
import { Label } from '@/components/ui/label';

/**
 * Privacy banner that appears when values are hidden
 *
 * Features:
 * - Shows warning when viewing masked/fake data
 * - Different messages for mask vs fake mode
 * - Quick action to reveal real values
 * - Dismissible or persistent (currently persistent for safety)
 *
 * Usage:
 * ```tsx
 * <PrivacyBanner />
 * ```
 */
export function PrivacyBanner() {
  const { isHidden, replacementMode, toggleHidden } = usePrivacy();

  // Don't render if values are visible
  if (!isHidden) {
    return null;
  }

  const getMessage = () => {
    if (replacementMode === 'fake') {
      return 'You are viewing fake numbers. All calculations and data use real values.';
    }
    return 'Sensitive values are currently hidden.';
  };

  const getIcon = () => {
    if (replacementMode === 'fake') {
      return <AlertCircle className="size-4" />;
    }
    return <Eye className="size-4" />;
  };

  return (
    <div className="sticky top-0 z-40 border-b bg-warning-muted border-warning/40">
      <div className="justify-center flex gap-2 items-center py-3 px-4">

        <div className="text-warning-text">
          {getIcon()}
        </div>
        <p className="text-sm font-medium text-warning-text">
          {getMessage()}
        </p>
        <Label size="sm" className="text-warning-text">Press <Kbd className='text-warning-text bg-warning/50'>{PRIVACY_KEYBOARD_SHORTCUT.displayLabel}</Kbd> to view real values</Label>


      </div>
    </div>
  );
}
