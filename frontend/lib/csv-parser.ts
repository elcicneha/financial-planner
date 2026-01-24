export interface Transaction {
  date: string;
  ticker: string;
  amount: string;
  nav: string;
  units: string;
  unitBalance: string;
}

// CSV column indices
const CSV_COLUMNS = {
  DATE: 0,
  TICKER: 1,
  AMOUNT: 4,
  NAV: 5,
  UNITS: 6,
  UNIT_BALANCE: 8,
} as const;

export function parseCSV(content: string): Transaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return {
      date: values[CSV_COLUMNS.DATE] || '',
      ticker: values[CSV_COLUMNS.TICKER] || '',
      amount: values[CSV_COLUMNS.AMOUNT] || '',
      nav: values[CSV_COLUMNS.NAV] || '',
      units: values[CSV_COLUMNS.UNITS] || '',
      unitBalance: values[CSV_COLUMNS.UNIT_BALANCE] || '',
    };
  }).filter((t) => t.date && t.ticker);
}

export function formatAmount(amount: string): { value: string; isNegative: boolean } {
  if (!amount) return { value: '-', isNegative: false };
  const isNegative = amount.startsWith('(') && amount.endsWith(')');
  const cleanValue = isNegative ? amount.slice(1, -1) : amount;
  return { value: cleanValue, isNegative };
}
