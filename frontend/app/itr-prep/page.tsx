'use client';

import { useCapitalGains } from '@/hooks/useCapitalGains';
import CapitalGainsTable from '@/components/CapitalGainsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ITRPrepPage() {
  const { data, loading, error, refetch } = useCapitalGains();

  // Loading state
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Calculating capital gains...</p>
          <p className="text-sm text-muted-foreground">
            This may take a moment if recalculating FIFO for all transactions
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
              Upload transaction PDFs to see FIFO capital gains calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you upload your mutual fund statement PDFs, we'll automatically calculate your
              capital gains using FIFO methodology for ITR preparation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state with data
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">ITR Prep</h1>
        <p className="text-muted-foreground">
          FIFO Capital Gains calculations for Income Tax Return filing
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Short-term Capital Gains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{data.summary.total_stcg.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Held for less than 365 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Long-term Capital Gains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{data.summary.total_ltcg.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Held for 365 days or more
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Capital Gains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              data.summary.total_gains >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              ₹{data.summary.total_gains.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.total_transactions} transaction{data.summary.total_transactions !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">FIFO Calculation</p>
              <p className="text-sm text-muted-foreground">
                Gains calculated using First-In-First-Out methodology.
                Sale Consideration and Acquisition Cost match ITR terminology for easy copy-paste filing.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Date Range: {data.summary.date_range}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Capital Gains Details</CardTitle>
          <CardDescription>
            Detailed FIFO matched transactions for each sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CapitalGainsTable gains={data.gains} refetch={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}
