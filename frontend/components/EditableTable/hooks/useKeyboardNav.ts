import { KeyboardEvent, RefObject, useCallback } from "react";

export interface UseKeyboardNavProps {
  onConfirm: () => void;
  onCancel: () => void;
  enabled?: boolean;
}

export function useKeyboardNav({ onConfirm, onCancel, enabled = true }: UseKeyboardNavProps) {
  /**
   * Find and focus the next focusable element in the DOM
   */
  const focusNextElement = useCallback(() => {
    const focusableSelectors = 'input, button, select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
  }, []);

  /**
   * Handle keyboard navigation for input fields
   * @param e - Keyboard event
   * @param nextRef - Optional ref to next field
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, nextRef?: RefObject<HTMLInputElement | null>) => {
      if (!enabled) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (nextRef?.current) {
          nextRef.current.focus();
        } else {
          // Last field - confirm
          onConfirm();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [enabled, onConfirm, onCancel]
  );

  /**
   * Handle keyboard navigation for date fields (Tab and Enter both advance)
   */
  const handleDateKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!enabled) return;

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        focusNextElement();
      } else if (e.key === "Enter") {
        e.preventDefault();
        focusNextElement();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [enabled, focusNextElement, onCancel]
  );

  return {
    handleKeyDown,
    handleDateKeyDown,
    focusNextElement,
  };
}
