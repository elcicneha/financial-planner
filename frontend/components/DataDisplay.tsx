'use client';

import { useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TransactionTable from '@/components/TransactionTable';
import { InputFile } from '@/components/ui/input-file';
import { useTransactionData } from '@/hooks/useTransactionData';

interface DataDisplayProps {
  refreshKey?: number;
  onDataStateChange?: (hasData: boolean) => void;
  onUploadSuccess?: () => void;
}

export default function DataDisplay({ refreshKey = 0, onDataStateChange, onUploadSuccess }: DataDisplayProps) {
  const { data, loading, error, refetch } = useTransactionData(refreshKey);

  // Notify parent about data state
  useEffect(() => {
    if (!loading) {
      onDataStateChange?.(!!data);
    }
  }, [data, loading, onDataStateChange]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={refetch}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <InputFile onSuccess={onUploadSuccess} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="px-6 py-4 border-b border-border">
        <p className="text-sm text-muted-foreground">
          Data till: <span className="font-medium text-foreground">{data.date}</span>
          <span className="mx-2">|</span>
          {data.transactionCount} transactions
        </p>
      </div>
      <CardContent className="p-0">
        <TransactionTable csvContent={data.csvContent} />
      </CardContent>
    </Card>
  );
}
