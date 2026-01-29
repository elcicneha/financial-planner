/**
 * Privacy system for masking sensitive financial values in the UI
 *
 * Core principles:
 * - All calculations and API calls use real values
 * - Privacy logic applies only at the presentation layer
 * - Two-state system: isHidden (show/hide) + replacementMode (how to display when hidden)
 * - Config-driven: easy to change mask characters or add/remove modes
 */

// ============================================================================
// CONFIGURATION (edit here to customize behavior)
// ============================================================================

/**
 * Keyboard shortcut configuration for privacy toggle
 *
 * To change shortcut: edit the key property
 * To require modifiers: set meta/ctrl/alt/shift to true
 */
export const PRIVACY_KEYBOARD_SHORTCUT = {
  key: 'h', // ← Edit this to change the trigger key
  metaKey: false, // Cmd on Mac, Windows key on Windows
  ctrlKey: false, // Ctrl key
  altKey: false, // Alt/Option key
  shiftKey: false, // Shift key
  displayLabel: 'H', // ← Edit this to show in UI (e.g., "⌘H", "Ctrl+H")
} as const;

/**
 * Available replacement modes when values are hidden
 *
 * To customize:
 * - Change mask character: edit the `char` property
 * - Remove fake numbers: delete the "fake" object
 * - Add new mode: add a new object with unique value
 */
export const REPLACEMENT_OPTIONS = [
  {
    value: "mask",
    label: "Mask",
    description: "Replace with characters",
    char: "•••••", // ← Edit this to change mask character (e.g., "🔒", "###", "***")
  },
  {
    value: "fake",
    label: "Fake Numbers",
    description: "Show fake but realistic values",
  },
] as const;

// ============================================================================
// TYPES
// ============================================================================

export type ReplacementMode = (typeof REPLACEMENT_OPTIONS)[number]["value"];

export interface PrivacyState {
  isHidden: boolean;
  replacementMode: ReplacementMode;
}

// ============================================================================
// FAKE VALUE GENERATION
// ============================================================================

/**
 * Generates a deterministic fake value based on the real value
 *
 * Requirements:
 * - Must be deterministic (same input = same output)
 * - Should look realistic but clearly different from real value
 * - Uses ±15-30% variance from original
 *
 * @param realValue - The actual numeric value
 * @param identifier - Optional string to differentiate similar values (e.g., "portfolio-total")
 * @returns A fake but stable numeric value
 */
export function generateFakeValue(
  realValue: number,
  identifier = ""
): number {
  // Create deterministic seed from value and identifier
  const seedString = `${realValue}-${identifier}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use hash to generate variance between -30% to +30%
  const normalizedHash = Math.abs(hash % 1000) / 1000; // 0 to 1
  const variance = -0.3 + normalizedHash * 0.6; // -0.3 to +0.3

  const fakeValue = realValue * (1 + variance);

  // Round to nearest integer for currency values
  return Math.round(fakeValue);
}

// ============================================================================
// DISPLAY RESOLUTION
// ============================================================================

/**
 * Resolves what value should be displayed based on privacy settings
 *
 * @param realValue - The actual numeric value
 * @param state - Current privacy state (isHidden + replacementMode)
 * @param identifier - Optional identifier for stable fake values
 * @returns The value to display, or null if should be masked with characters
 */
export function resolveDisplayValue(
  realValue: number | null | undefined,
  state: PrivacyState,
  identifier = ""
): number | null {
  // Handle invalid/missing values
  if (realValue === null || realValue === undefined) {
    return null;
  }

  // If not hidden, show real value
  if (!state.isHidden) {
    return realValue;
  }

  // When hidden, apply replacement mode
  switch (state.replacementMode) {
    case "mask":
      return null; // Will be replaced with mask character in formatter
    case "fake":
      return generateFakeValue(realValue, identifier);
    default:
      // Fallback for any future modes not explicitly handled
      return null;
  }
}

// ============================================================================
// MASK CHARACTER LOOKUP
// ============================================================================

/**
 * Gets the mask character for the current replacement mode
 *
 * @param mode - Current replacement mode
 * @returns The mask character string, or default if not found
 */
export function getMaskCharacter(mode: ReplacementMode): string {
  const option = REPLACEMENT_OPTIONS.find((opt) => opt.value === mode);
  return option && "char" in option ? option.char : "•••••";
}

// ============================================================================
// FORMATTING HELPER
// ============================================================================

/**
 * Privacy-aware string formatter
 * Returns masked string when value is intentionally hidden
 *
 * @param value - The resolved display value (from resolveDisplayValue)
 * @param formatter - Function to format the numeric value
 * @param maskChar - Character(s) to display when value is null
 * @returns Formatted string
 */
export function formatPrivateValue(
  value: number | null,
  formatter: (val: number) => string,
  maskChar = "•••••"
): string {
  if (value === null) {
    return maskChar;
  }
  return formatter(value);
}
