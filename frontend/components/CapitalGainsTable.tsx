import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FIFOGainRow } from '@/hooks/useCapitalGains';

interface CapitalGainsTableProps {
  gains: FIFOGainRow[];
}

export default function CapitalGainsTable({ gains }: CapitalGainsTableProps) {
  const sortedGains = useMemo(() => {
    return [...gains].sort((a, b) => {
      // Sort by sell date descending (most recent first)
      return b.sell_date.localeCompare(a.sell_date);
    });
  }, [gains]);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (value: number, decimals: number = 3): string => {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (gains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No capital gains data available. Upload transaction PDFs to see results.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableCaption>
          FIFO Capital Gains - {sortedGains.length} transaction{sortedGains.length !== 1 ? 's' : ''}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Sell Date</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead>Folio</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Sell NAV</TableHead>
            <TableHead className="text-right">Sale Consideration</TableHead>
            <TableHead>Buy Date</TableHead>
            <TableHead className="text-right">Buy NAV</TableHead>
            <TableHead className="text-right">Acquisition Cost</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
            <TableHead className="text-right">Days Held</TableHead>
            <TableHead>Term</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGains.map((gain, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-sm">{gain.sell_date}</TableCell>
              <TableCell className="font-medium">{gain.ticker}</TableCell>
              <TableCell className="text-muted-foreground">{gain.folio}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(gain.units)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(gain.sell_nav, 4)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                ₹{formatCurrency(gain.sale_consideration)}
              </TableCell>
              <TableCell className="font-mono text-sm">{gain.buy_date}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatNumber(gain.buy_nav, 4)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                ₹{formatCurrency(gain.acquisition_cost)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-sm font-medium ${
                  gain.gain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                ₹{formatCurrency(gain.gain)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {gain.holding_days}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    gain.term === 'Long-term'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {gain.term}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
