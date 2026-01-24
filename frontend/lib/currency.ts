// Currency configuration
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

export const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string }> = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
};

let currentCurrency: CurrencyCode = DEFAULT_CURRENCY;

export function setCurrency(currency: CurrencyCode): void {
  currentCurrency = currency;
}

export function getCurrency(): CurrencyCode {
  return currentCurrency;
}

export function getCurrencySymbol(currency: CurrencyCode = currentCurrency): string {
  return CURRENCY_CONFIG[currency].symbol;
}

/**
 * Formats a number as currency using the appropriate locale
 * For INR, uses Indian numbering system (lakhs, crores): 2,50,000
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = currentCurrency,
  showSymbol: boolean = true
): string {
  const config = CURRENCY_CONFIG[currency];
  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}

/**
 * Formats a number using Indian numbering system (or appropriate locale)
 * without currency symbol
 */
export function formatNumber(
  amount: number,
  currency: CurrencyCode = currentCurrency
): string {
  const config = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parses a formatted currency/number string back to a number
 * Removes currency symbols and formatting
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₹$€£,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
