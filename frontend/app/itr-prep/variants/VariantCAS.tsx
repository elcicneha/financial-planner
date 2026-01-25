'use client';

import { useState } from 'react';
import { useCASCapitalGains, CASCategoryData } from '@/hooks/useCASCapitalGains';
import { useCASFiles } from '@/hooks/useCASFiles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CASUploadDialog } from '../components/CASUploadDialog';
import { formatCurrency } from '@/lib/currency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryCardProps {
  title: string;
  data: CASCategoryData;
}

function CategoryCard({ title, data }: CategoryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Sale Consideration</p>
          <p className="text-xl font-semibold">{formatCurrency(data.sale_consideration)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Acquisition Cost</p>
          <p className="text-xl font-semibold">{formatCurrency(data.acquisition_cost)}</p>
        </div>
        <div className="space-y-1 pt-2 border-t">
          <p className="text-sm text-muted-foreground">Gain/Loss</p>
          <p className={`text-2xl font-bold ${data.gain_loss >= 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
            }`}>
            {formatCurrency(data.gain_loss)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VariantCAS() {
  const [selectedFY, setSelectedFY] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

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
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with Upload and FY Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">ITR Prep - CAS Statement</h1>
          <p className="text-muted-foreground">
            Capital gains from Capital Account Statement for Income Tax Return filing
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Financial Year Selector */}
          {casFiles.length > 0 && (
            <Select value={selectedFY || casFiles[0].financial_year} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[140px]">
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
          {/* Upload Button */}
          <CASUploadDialog onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      {/* Total Gains Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Total Capital Gains</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-4xl font-bold ${totalGains >= 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
            }`}>
            {formatCurrency(totalGains)}
          </p>
        </CardContent>
      </Card>

      {/* Info Card */}
      {/* <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">CAS Statement Data</p>
              <p className="text-sm text-muted-foreground">
                Data extracted from Capital Account Statement. All values match ITR terminology
                for easy copy-paste filing. Organized by asset class and holding period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Equity Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Equity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryCard
            title="Short-term (< 1 year)"
            data={data.equity_short_term}
          />
          <CategoryCard
            title="Long-term (≥ 1 year)"
            data={data.equity_long_term}
          />
        </div>
      </div>

      {/* Debt Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Debt</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryCard
            title="Short-term (< 3 years)"
            data={data.debt_short_term}
          />
          <CategoryCard
            title="Long-term (≥ 3 years)"
            data={data.debt_long_term}
          />
        </div>
      </div>
    </div>
  );
}
