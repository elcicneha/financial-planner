import { useState, useEffect } from 'react';

/**
 * Hook to detect if the component has been hydrated on the client.
 *
 * Useful for avoiding hydration mismatches when using localStorage
 * or other client-only APIs that would cause server/client content
 * to differ.
 *
 * @returns true once the component has mounted on the client
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const hydrated = useHydrated();
 *   const [theme, setTheme] = useState('light');
 *
 *   useEffect(() => {
 *     if (hydrated) {
 *       setTheme(localStorage.getItem('theme') || 'light');
 *     }
 *   }, [hydrated]);
 *
 *   // Render safely without hydration mismatch
 *   return <div>{hydrated ? theme : 'light'}</div>;
 * }
 * ```
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
