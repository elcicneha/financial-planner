import { usePrivacy } from '@/components/privacy/PrivacyProvider';
import {
  formatCurrency as baseFormatCurrency,
  formatNumber as baseFormatNumber,
  CurrencyCode,
} from '@/lib/currency';
import {
  resolveDisplayValue,
  getMaskCharacter,
  formatPrivateValue,
} from '@/lib/privacy';

/**
 * Hook that provides privacy-aware currency formatting functions
 *
 * Usage:
 * ```tsx
 * const { formatCurrency, formatNumber } = usePrivateCurrency();
 * return <span>{formatCurrency(amount)}</span>;
 * ```
 *
 * The returned functions automatically apply privacy settings:
 * - In "real" mode: shows actual values
 * - In "hidden + mask" mode: shows mask characters (•••••)
 * - In "hidden + fake" mode: shows deterministic fake values
 */
export function usePrivateCurrency() {
  const { isHidden, replacementMode } = usePrivacy();

  /**
   * Format currency with privacy applied
   */
  const formatCurrency = (
    amount: number | null | undefined,
    currency?: CurrencyCode,
    showSymbol: boolean = true,
    identifier = ''
  ): string => {
    const displayValue = resolveDisplayValue(
      amount,
      { isHidden, replacementMode },
      identifier
    );

    return formatPrivateValue(
      displayValue,
      (val) => baseFormatCurrency(val, currency, showSymbol),
      getMaskCharacter(replacementMode)
    );
  };

  /**
   * Format number with privacy applied (no currency symbol)
   */
  const formatNumber = (
    amount: number | null | undefined,
    currency?: CurrencyCode,
    identifier = ''
  ): string => {
    const displayValue = resolveDisplayValue(
      amount,
      { isHidden, replacementMode },
      identifier
    );

    return formatPrivateValue(
      displayValue,
      (val) => baseFormatNumber(val, currency),
      getMaskCharacter(replacementMode)
    );
  };

  return {
    formatCurrency,
    formatNumber,
    isHidden,
    replacementMode,
  };
}
