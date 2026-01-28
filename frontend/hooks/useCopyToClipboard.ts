import { useState, useCallback } from 'react';

export function useCopyToClipboard(resetDelay = 2000) {
  const [hasCopied, setHasCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), resetDelay);
      return true;
    } catch {
      return false;
    }
  }, [resetDelay]);

  return { hasCopied, copy };
}
