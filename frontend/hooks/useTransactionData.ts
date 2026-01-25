'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProcessedFile {
  file_id: string;
  date: string;
  csv_path: string;
}

export interface TransactionRecord {
  date: string;
  ticker: string;
  folio: string;
  isin: string;
  amount: string;
  nav: string;
  units: string;
  balance: string;
  fund_name?: string;
}

interface TransactionData {
  transactions: TransactionRecord[];
  date: string;
  transactionCount: number;
}

interface UseTransactionDataResult {
  data: TransactionData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactionData(refreshKey = 0): UseTransactionDataResult {
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get list of processed files
      const filesRes = await fetch('/api/files');
      if (!filesRes.ok) {
        throw new Error('Failed to fetch files');
      }

      const { files }: { files: ProcessedFile[] } = await filesRes.json();

      if (files.length === 0) {
        setData(null);
        return;
      }

      // Step 2: Get content of most recent file (already sorted by date, newest first)
      const mostRecent = files[0];
      const resultRes = await fetch(`/api/results/${mostRecent.file_id}`);

      if (!resultRes.ok) {
        throw new Error('Failed to fetch transaction data');
      }

      const { transactions } = await resultRes.json();

      if (!transactions || transactions.length === 0) {
        setData(null);
        return;
      }

      setData({
        transactions,
        date: mostRecent.date,
        transactionCount: transactions.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  return { data, loading, error, refetch: fetchData };
}
