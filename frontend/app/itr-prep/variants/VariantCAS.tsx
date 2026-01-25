'use client';

import { useState } from 'react';
import { useCASCapitalGains } from '@/hooks/useCASCapitalGains';
import { useCASFiles } from '@/hooks/useCASFiles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CASUploadDialog } from '../components/CASUploadDialog';
import { formatCurrency } from '@/lib/currency';
import { CopyButton } from '@/components/ui/copy-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CategoryCard } from '../components/CategoryCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function VariantCAS() {
  const [selectedFY, setSelectedFY] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSourceOpen, setIsSourceOpen] = useState(false);

  // Fetch available CAS files
  const { files: casFiles } = useCASFiles(refreshKey);

  // Fetch capital gains for selected FY
  const { data, loading, error, refetch } = useCASCapitalGains(selectedFY, refreshKey);

  // Handle upload success
  const handleUploadSuccess = (financialYears: string[]) => {
    // Refresh file list and data
    setRefreshKey((prev) => prev + 1);
    // Select the last uploaded financial year
    if (financialYears.length > 0) {
      setSelectedFY(financialYears[financialYears.length - 1]);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading CAS capital gains data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">ITR Prep - CAS Statement</h1>
          <CASUploadDialog onUploadSuccess={handleUploadSuccess} />
        </div>
        <div className="flex h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Error Loading CAS Data</CardTitle>
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
      </div>
    );
  }

  // Empty state - no CAS files uploaded yet
  if (!data || !data.has_files) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">ITR Prep - CAS Statement</h1>
        </div>
        <div className="flex h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle>No CAS Data Available</CardTitle>
              </div>
              <CardDescription>
                Upload a CAS Excel file to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload your Capital Gains Statement Excel file to view capital gains data organized for ITR filing.
              </p>
              <CASUploadDialog onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalGains =
    data.equity_short_term.gain_loss +
    data.equity_long_term.gain_loss +
    data.debt_short_term.gain_loss +
    data.debt_long_term.gain_loss;

  // Success state with data
  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-5 max-w-4xl">
        {/* Header with Upload and FY Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Capital Gains - CAS</h1>
            <p className="text-sm text-muted-foreground">
              Updated {new Date(data.last_updated).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {casFiles.length > 0 && (
              <Select value={selectedFY || casFiles[0].financial_year} onValueChange={setSelectedFY}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Select FY" />
                </SelectTrigger>
                <SelectContent>
                  {casFiles.map((file) => (
                    <SelectItem key={file.financial_year} value={file.financial_year}>
                      FY {file.financial_year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <CASUploadDialog onUploadSuccess={handleUploadSuccess} />
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
              data={data.equity_short_term}
            />
            <CategoryCard
              title="Long-term"
              subtitle="≥ 1 year"
              data={data.equity_long_term}
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
              data={data.debt_short_term}
            />
            <CategoryCard
              title="Long-term"
              subtitle="≥ 3 years"
              data={data.debt_long_term}
            />
          </div>
        </div>

        {/* Collapsible Source Data */}
        <Card>
          <button
            onClick={() => setIsSourceOpen(!isSourceOpen)}
            className="w-full text-left"
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Source Data</CardTitle>
                <CardDescription>
                  {data.transactions && data.transactions.length > 0
                    ? `Individual transactions from CAS (${data.transactions.length} transaction${data.transactions.length !== 1 ? 's' : ''})`
                    : 'Transaction details not available in CAS file'}
                </CardDescription>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isSourceOpen ? 'rotate-180' : ''
                }`}
              />
            </CardHeader>
          </button>
          {isSourceOpen && (
            <CardContent>
              {data.transactions && data.transactions.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Folio</TableHead>
                        <TableHead>Buy Date</TableHead>
                        <TableHead>Sell Date</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Buy NAV</TableHead>
                        <TableHead className="text-right">Sell NAV</TableHead>
                        <TableHead className="text-right">Sale Value</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Gain/Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.transactions.map((txn, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium max-w-[200px] truncate" title={txn.fund_name}>
                            {txn.fund_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{txn.folio}</TableCell>
                          <TableCell className="font-mono text-sm">{txn.buy_date}</TableCell>
                          <TableCell className="font-mono text-sm">{txn.sell_date}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {txn.units.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {txn.buy_nav.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {txn.sell_nav.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(txn.sale_consideration)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(txn.acquisition_cost)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm font-medium ${
                              txn.gain_loss >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatCurrency(txn.gain_loss)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Individual transaction details are not available. The CAS file only contains summary totals.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
