'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Transaction {
  date: string;
  ticker: string;
  amount: string;
  nav: string;
  units: string;
  unitBalance: string;
}

interface TransactionTableProps {
  csvContent: string;
}

function parseCSV(content: string): Transaction[] {
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
      date: values[0] || '',
      ticker: values[1] || '',
      amount: values[4] || '',
      nav: values[5] || '',
      units: values[6] || '',
      unitBalance: values[8] || '',
    };
  }).filter((t) => t.date && t.ticker);
}

function formatAmount(amount: string): { value: string; isNegative: boolean } {
  if (!amount) return { value: '-', isNegative: false };
  const isNegative = amount.startsWith('(') && amount.endsWith(')');
  const cleanValue = isNegative ? amount.slice(1, -1) : amount;
  return { value: cleanValue, isNegative };
}

export default function TransactionTable({ csvContent }: TransactionTableProps) {
  const transactions = useMemo(() => parseCSV(csvContent), [csvContent]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions found in the data.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Fund</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">NAV</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t, idx) => {
          const amount = formatAmount(t.amount);
          const units = formatAmount(t.units);
          return (
            <TableRow key={idx}>
              <TableCell className="font-mono text-xs">{t.date}</TableCell>
              <TableCell>
                <span className="font-mono text-xs truncate max-w-[200px] block" title={t.ticker}>
                  {t.ticker}
                </span>
              </TableCell>
              <TableCell className={cn(
                "text-right font-mono text-xs",
                amount.isNegative && "text-red-500 dark:text-red-400"
              )}>
                {amount.isNegative && '-'}{amount.value}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{t.nav || '-'}</TableCell>
              <TableCell className={cn(
                "text-right font-mono text-xs",
                units.isNegative && "text-red-500 dark:text-red-400"
              )}>
                {units.isNegative && '-'}{units.value}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{t.unitBalance || '-'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
