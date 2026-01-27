'use client';

import { useState, useMemo } from 'react';
import { useCapitalGains, FIFOGainRow } from '@/hooks/useCapitalGains';
import CapitalGainsTable from '@/components/CapitalGainsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, TrendingUp, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryCard, CategoryData } from '../components/CategoryCard';
import { CopyButton } from '@/components/ui/copy-button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/currency';
import { getGainLossColor } from '@/lib/utils';
import { VariantProps } from './index';
import { useDevMode } from '@/components/dev/DevModeProvider';

// Aggregate FIFO gains into 4 categories (excluding unknown)
function aggregateGainsByCategory(gains: FIFOGainRow[]): {
  equity_short_term: CategoryData;
  equity_long_term: CategoryData;
  debt_short_term: CategoryData;
  debt_long_term: CategoryData;
} {
  const categories = {
    equity_short_term: { sale_consideration: 0, acquisition_cost: 0, gain_loss: 0 },
    equity_long_term: { sale_consideration: 0, acquisition_cost: 0, gain_loss: 0 },
    debt_short_term: { sale_consideration: 0, acquisition_cost: 0, gain_loss: 0 },
    debt_long_term: { sale_consideration: 0, acquisition_cost: 0, gain_loss: 0 },
  };

  for (const gain of gains) {
    const fundType = gain.fund_type;
    const isLongTerm = gain.term === 'Long-term';

    // Skip unknown funds - they should be shown in a warning
    if (fundType === 'unknown') {
      continue;
    }

    let category: CategoryData;
    if (fundType === 'equity' && !isLongTerm) {
      category = categories.equity_short_term;
    } else if (fundType === 'equity' && isLongTerm) {
      category = categories.equity_long_term;
    } else if (fundType === 'debt' && !isLongTerm) {
      category = categories.debt_short_term;
    } else if (fundType === 'debt' && isLongTerm) {
      category = categories.debt_long_term;
    } else {
      // Shouldn't reach here, but just in case
      continue;
    }

    category.sale_consideration += gain.sale_consideration;
    category.acquisition_cost += gain.acquisition_cost;
    category.gain_loss += gain.gain;
  }

  return categories;
}

export default function VariantFIFO({ selectedFY, fyLoading }: VariantProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isDevMode } = useDevMode();

  // Only fetch when FYs are loaded AND selectedFY is set
  const enabled = !fyLoading && selectedFY !== '';
  const { data, loading, error, refetch, forceRefetch } = useCapitalGains(0, selectedFY || undefined, enabled);

  const handleRecalculate = async () => {
    setIsRefreshing(true);
    try {
      forceRefetch();
    } finally {
      // Add slight delay to ensure the refresh completes
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Aggregate gains into 4 categories
  const categories = useMemo(
    () => aggregateGainsByCategory(data?.gains ?? []),
    [data?.gains]
  );

  // Find unknown funds that need classification
  const unknownFunds = useMemo(() => {
    const gains = data?.gains ?? [];
    const unknownTickers = new Set<string>();
    gains.forEach(gain => {
      if (gain.fund_type === 'unknown') {
        unknownTickers.add(gain.ticker);
      }
    });
    return Array.from(unknownTickers);
  }, [data?.gains]);

  // Calculate total gains
  const totalGains =
    categories.equity_short_term.gain_loss +
    categories.equity_long_term.gain_loss +
    categories.debt_short_term.gain_loss +
    categories.debt_long_term.gain_loss;

  // Loading state
  if (loading || fyLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Calculating capital gains...</p>
          <p className="text-sm text-muted-foreground">
            This may take a moment if recalculating for all transactions
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              <CardTitle>Error Loading Capital Gains</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={refetch} variant="outline" className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!data || data.gains.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-muted-foreground" />
              <CardTitle>
                {selectedFY ? `No Capital Gains Data for ${selectedFY}` : 'No Capital Gains Data'}
              </CardTitle>
            </div>
            <CardDescription>
              {selectedFY
                ? `No transactions found for ${selectedFY}`
                : 'Upload transaction PDFs to see capital gains calculations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {selectedFY
                ? `Upload mutual fund statement PDFs with transactions for ${selectedFY} to see capital gains calculations.`
                : 'Once you upload your mutual fund statement PDFs, we will automatically calculate your capital gains for ITR preparation.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state with data
  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Calculations</h1>
            <p className="text-sm text-muted-foreground">
              Updated {new Date(data.last_updated).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          {isDevMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRecalculate}
                  disabled={isRefreshing}
                  className="size-9"
                >
                  <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recalculate FIFO gains</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Unknown Funds Warning */}
        {unknownFunds.length > 0 && (
          <Card className="bg-warning-muted">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-warning-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base text-warning-foreground">
                    Unknown Fund Classification
                  </CardTitle>
                  <CardDescription className="text-warning-text mt-1">
                    The following {unknownFunds.length} fund{unknownFunds.length > 1 ? 's' : ''} could not be automatically classified as equity or debt due to missing market cap data. These funds are excluded from the totals below.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {unknownFunds.map((ticker) => (
                  <code key={ticker} className="px-2 py-1 text-xs rounded bg-warning/20 text-warning-text border border-warning/80">
                    {ticker}
                  </code>
                ))}
              </div>
              <p className="text-xs text-warning-text mt-3">
                Tip: You can manually override the fund type in the Source Data table below.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Total Gains - Compact */}
        <Card>
          <CardContent className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">Total Capital Gains</span>
              {unknownFunds.length > 0 && (
                <span className="text-xs text-muted-foreground/70">Excludes {unknownFunds.length} unknown fund{unknownFunds.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className={`font-mono text-lg font-semibold tabular-nums ${getGainLossColor(totalGains)}`}>
                {formatCurrency(totalGains)}
              </span>
              <CopyButton
                value={Math.abs(totalGains).toFixed(4)}
                tooltip="Copy Total"
                className="size-7"
              />
            </div>
          </CardContent>
        </Card>

        {/* Equity Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Equity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <CategoryCard
              title="Short-term"
              subtitle="< 1 year"
              data={categories.equity_short_term}
            />
            <CategoryCard
              title="Long-term"
              subtitle="≥ 1 year"
              data={categories.equity_long_term}
            />
          </div>
        </div>

        {/* Debt Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Debt</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <CategoryCard
              title="Short-term"
              subtitle="< 3 years"
              data={categories.debt_short_term}
            />
            <CategoryCard
              title="Long-term"
              subtitle="≥ 3 years"
              data={categories.debt_long_term}
            />
          </div>
        </div>

        {/* Collapsible Gains Table */}
        <Card>
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="w-full text-left"
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Source Data</CardTitle>
                <CardDescription>
                  Detailed matched transactions ({data.summary.total_transactions} transaction{data.summary.total_transactions !== 1 ? 's' : ''})
                </CardDescription>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''
                  }`}
              />
            </CardHeader>
          </button>
          {isDetailsOpen && (
            <CardContent>
              <CapitalGainsTable gains={data.gains} refetch={refetch} forceRefetch={forceRefetch} />
            </CardContent>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
