'use client';

import { usePrivacy } from './PrivacyProvider';
import { PrivacyToggle } from './PrivacyToggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPLACEMENT_OPTIONS, ReplacementMode } from '@/lib/privacy';
import { Kbd } from '@/components/ui/kbd';
import { PRIVACY_KEYBOARD_SHORTCUT } from '@/lib/privacy';
import { Label } from '@/components/ui/label';

/**
 * Combined privacy switcher component
 *
 * Features:
 * - Eye/EyeOff toggle button for show/hide (with keyboard shortcut)
 * - Select dropdown for choosing replacement mode (mask vs fake)
 * - Only enables selector when isHidden = true
 *
 * Usage:
 * ```tsx
 * <PrivacySwitcher />
 * ```
 */
export function PrivacySwitcher() {
  const { isHidden, replacementMode, setReplacementMode } = usePrivacy();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <Label size="sm">Privacy</Label>
        <Label className="text-xs text-muted-foreground">
          <span>Press</span>
          <Kbd>{PRIVACY_KEYBOARD_SHORTCUT.displayLabel}</Kbd>
        </Label>
      </div>
      <div className="flex gap-2">
        <Select
          value={replacementMode}
          onValueChange={(value) => setReplacementMode(value as ReplacementMode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {REPLACEMENT_OPTIONS.find(opt => opt.value === replacementMode)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {REPLACEMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col gap-0.5">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PrivacyToggle className="size-9 shrink-0" />
      </div>
    </div>
  );
}
