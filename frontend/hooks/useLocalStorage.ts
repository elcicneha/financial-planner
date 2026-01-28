import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<T>(defaultValue);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error);
    }
    setMounted(true);
  }, [key]);

  // Save to localStorage on change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }, [key, value, mounted]);

  return [value, setValue, mounted];
}
