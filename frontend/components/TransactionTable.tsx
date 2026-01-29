'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { TransactionRecord } from '@/hooks/useTransactionData';
import { usePrivateCurrency } from '@/hooks/usePrivateCurrency';

interface TransactionTableProps {
  transactions: TransactionRecord[];
}

type SortKey = 'date' | 'ticker' | 'amount' | 'nav' | 'units' | 'balance';
type SortDirection = 'asc' | 'desc';

function parseNumericString(str: string): number {
  if (!str) return 0;
  const isNegative = str.startsWith('(') && str.endsWith(')');
  const clean = str.replace(/[(),₹\s]/g, '');
  const num = parseFloat(clean) || 0;
  return isNegative ? -num : num;
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { formatCurrency } = usePrivateCurrency();

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  const getSortProps = useCallback(
    (key: SortKey) => ({
      sortable: true as const,
      sorted: sortKey === key ? sortDirection : (false as const),
      onSort: () => handleSort(key),
    }),
    [sortKey, sortDirection, handleSort]
  );

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'ticker':
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case 'amount':
          comparison = parseNumericString(a.amount) - parseNumericString(b.amount);
          break;
        case 'nav':
          comparison = parseNumericString(a.nav) - parseNumericString(b.nav);
          break;
        case 'units':
          comparison = parseNumericString(a.units) - parseNumericString(b.units);
          break;
        case 'balance':
          comparison = parseNumericString(a.balance) - parseNumericString(b.balance);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortKey, sortDirection]);

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
          <TableHead {...getSortProps('date')}>Date</TableHead>
          <TableHead {...getSortProps('ticker')}>Fund</TableHead>
          <TableHead className="text-right" {...getSortProps('amount')}>Amount</TableHead>
          <TableHead className="text-right" {...getSortProps('nav')}>NAV</TableHead>
          <TableHead className="text-right" {...getSortProps('units')}>Units</TableHead>
          <TableHead className="text-right" {...getSortProps('balance')}>Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTransactions.map((t, idx) => {
          // Parse and format with privacy
          const amountNum = parseNumericString(t.amount);
          const navNum = parseNumericString(t.nav);
          const unitsNum = parseNumericString(t.units);
          const balanceNum = parseNumericString(t.balance);

          const amountFormatted = t.amount ? formatCurrency(amountNum, undefined, true, `amount-${t.date}-${idx}`) : '-';
          const navFormatted = t.nav ? formatCurrency(navNum, undefined, true, `nav-${t.date}-${idx}`) : '-';
          const unitsFormatted = t.units ? formatCurrency(unitsNum, undefined, false, `units-${t.date}-${idx}`) : '-';
          const balanceFormatted = t.balance ? formatCurrency(balanceNum, undefined, false, `balance-${t.date}-${idx}`) : '-';

          return (
            <TableRow key={`${t.date}-${t.ticker}-${idx}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 48px' }}>
              <TableCell className="font-mono text-xs">{t.date}</TableCell>
              <TableCell>
                <span className="font-mono text-xs truncate max-w-[200px] block" title={t.ticker}>
                  {t.ticker}
                </span>
              </TableCell>
              <TableCell className={cn(
                "text-right font-mono text-xs",
                amountNum < 0 && "text-destructive-text"
              )}>
                {amountFormatted}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{navFormatted}</TableCell>
              <TableCell className={cn(
                "text-right font-mono text-xs",
                unitsNum < 0 && "text-destructive-text"
              )}>
                {unitsFormatted}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{balanceFormatted}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
