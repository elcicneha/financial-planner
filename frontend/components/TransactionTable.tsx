'use client';

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

interface TransactionTableProps {
  transactions: TransactionRecord[];
}

function formatAmount(amount: string): { value: string; isNegative: boolean } {
  if (!amount) return { value: '-', isNegative: false };
  const isNegative = amount.startsWith('(') && amount.endsWith(')');
  const cleanValue = isNegative ? amount.slice(1, -1) : amount;
  return { value: cleanValue, isNegative };
}

export default function TransactionTable({ transactions }: TransactionTableProps) {

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
            <TableRow key={`${t.date}-${t.ticker}-${idx}`}>
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
              <TableCell className="text-right font-mono text-xs">{t.balance || '-'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
