'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCapitalGains, FIFOGainRow } from '@/hooks/useCapitalGains';
import { useAvailableFinancialYears } from '@/hooks/useAvailableFinancialYears';
import CapitalGainsTable from '@/components/CapitalGainsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryCard, CategoryData } from '../components/CategoryCard';
import { CopyButton } from '@/components/ui/copy-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/currency';

// Aggregate FIFO gains into 4 categories
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
    const isEquity = gain.fund_type === 'equity';
    const isLongTerm = gain.term === 'Long-term';

    let category: CategoryData;
    if (isEquity && !isLongTerm) {
      category = categories.equity_short_term;
    } else if (isEquity && isLongTerm) {
      category = categories.equity_long_term;
    } else if (!isEquity && !isLongTerm) {
      category = categories.debt_short_term;
    } else {
      category = categories.debt_long_term;
    }

    category.sale_consideration += gain.sale_consideration;
    category.acquisition_cost += gain.acquisition_cost;
    category.gain_loss += gain.gain;
  }

  return categories;
}

const FY_STORAGE_KEY = 'itr-prep-fifo-fy';

export default function VariantFIFO() {
  // Load selected FY from localStorage
  const [selectedFY, setSelectedFY] = useState<string>('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { financialYears, loading: fyLoading } = useAvailableFinancialYears();

  // Initialize selectedFY from localStorage or default to first available FY
  useEffect(() => {
    const stored = localStorage.getItem(FY_STORAGE_KEY);
    if (stored && financialYears.includes(stored)) {
      setSelectedFY(stored);
    } else if (financialYears.length > 0) {
      setSelectedFY(financialYears[0]);
    }
  }, [financialYears]);

  // Only fetch when FYs are loaded AND (selectedFY is set OR no FYs available)
  const enabled = !fyLoading && (selectedFY !== '' || financialYears.length === 0);
  const { data, loading, error, refetch } = useCapitalGains(0, selectedFY || undefined, enabled);

  // Aggregate gains into 4 categories (must be called before any early returns)
  const categories = useMemo(
    () => aggregateGainsByCategory(data?.gains ?? []),
    [data?.gains]
  );

  // Calculate total gains
  const totalGains =
    categories.equity_short_term.gain_loss +
    categories.equity_long_term.gain_loss +
    categories.debt_short_term.gain_loss +
    categories.debt_long_term.gain_loss;

  const handleFYChange = (fy: string) => {
    setSelectedFY(fy);
    localStorage.setItem(FY_STORAGE_KEY, fy);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
              <AlertCircle className="h-5 w-5 text-destructive" />
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
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle>No Capital Gains Data</CardTitle>
            </div>
            <CardDescription>
              Upload transaction PDFs to see capital gains calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you upload your mutual fund statement PDFs, we'll automatically calculate your
              capital gains for ITR preparation.
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
        {/* Header with FY Selector */}
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
          <div className="flex items-center gap-2">
            {financialYears.length > 0 && (
              <Select value={selectedFY} onValueChange={handleFYChange}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Select FY" />
                </SelectTrigger>
                <SelectContent>
                  {financialYears.map((fy) => (
                    <SelectItem key={fy} value={fy}>
                      FY {fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Total Gains - Compact */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/50 border">
          <span className="text-sm font-medium text-muted-foreground">Total Capital Gains</span>
          <div className="flex items-center gap-1">
            <span className={`font-mono text-lg font-semibold tabular-nums ${totalGains >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500 dark:text-red-400'
              }`}>
              {formatCurrency(totalGains)}
            </span>
            <CopyButton
              value={Math.abs(totalGains).toFixed(4)}
              tooltip="Copy Total"
              className="h-7 w-7"
            />
          </div>
        </div>

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
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isDetailsOpen ? 'rotate-180' : ''
                }`}
              />
            </CardHeader>
          </button>
          {isDetailsOpen && (
            <CardContent>
              <CapitalGainsTable gains={data.gains} refetch={refetch} />
            </CardContent>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
