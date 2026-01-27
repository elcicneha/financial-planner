'use client';

import { useEffect } from 'react';
import { Loader2, AlertCircle, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TransactionTable from '@/components/TransactionTable';
import { UploadDialog } from '@/components/UploadDialog';
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
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
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
            <div className="p-3 rounded-full bg-destructive-muted">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={refetch}>
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-muted">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">Upload a PDF statement to get started</p>
            </div>
            <UploadDialog
              endpoint="/api/upload"
              accept=".pdf"
              multiple={false}
              onSuccess={onUploadSuccess}
            >
              <UploadDialog.Trigger asChild>
                <Button>
                  <Upload className="size-4" />
                  Upload PDF
                </Button>
              </UploadDialog.Trigger>
              <UploadDialog.Content>
                <UploadDialog.Header>
                  <UploadDialog.Title>Upload Statement</UploadDialog.Title>
                  <UploadDialog.Description>
                    Upload a mutual fund PDF statement to extract transactions
                  </UploadDialog.Description>
                </UploadDialog.Header>
                <UploadDialog.Body placeholder="Drag and drop your PDF here" />
                <UploadDialog.Footer />
              </UploadDialog.Content>
            </UploadDialog>
          </div>
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
        <TransactionTable transactions={data.transactions} />
      </CardContent>
    </Card>
  );
}
