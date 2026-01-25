'use client';

import { Switch } from '@/components/ui/switch';
import { useDevMode } from './DevModeProvider';

export function EmptyDefaultsToggle() {
  const { useEmptyDefaults, toggleEmptyDefaults } = useDevMode();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Switch
        checked={useEmptyDefaults}
        onCheckedChange={toggleEmptyDefaults}
      />
      <label
        className="text-muted-foreground cursor-pointer"
        onClick={toggleEmptyDefaults}
      >
        Start with empty values
      </label>
    </div>
  );
}
