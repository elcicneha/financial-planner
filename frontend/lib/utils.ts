import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns Tailwind classes for positive (gain) or negative (loss) values
 * @param value - Number to check (positive/zero = gain, negative = loss)
 * @returns Tailwind color classes with dark mode support
 */
export function getGainLossColor(value: number): string {
  return value >= 0
    ? 'text-success-text'
    : 'text-destructive-text'
}
