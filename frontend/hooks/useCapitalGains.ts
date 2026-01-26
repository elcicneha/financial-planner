import { useState, useEffect, useCallback } from 'react';

export interface FIFOGainRow {
  sell_date: string;
  ticker: string;
  folio: string;
  units: number;
  sell_nav: number;
  sale_consideration: number;
  buy_date: string;
  buy_nav: number;
  acquisition_cost: number;
  gain: number;
  holding_days: number;
  fund_type: string;  // "equity" or "debt"
  term: string;
  financial_year: string;  // e.g., "2024-25"
}

export interface FIFOSummary {
  total_stcg: number;
  total_ltcg: number;
  total_gains: number;
  total_transactions: number;
  date_range: string;
}

export interface CapitalGainsData {
  gains: FIFOGainRow[];
  summary: FIFOSummary;
  last_updated: string;
}

interface UseCapitalGainsResult {
  data: CapitalGainsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  forceRefetch: () => void;
}

export function useCapitalGains(refreshKey = 0, fy?: string, enabled = true): UseCapitalGainsResult {
  const [data, setData] = useState<CapitalGainsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapitalGains = useCallback(async (forceRecalculate = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (fy) params.set('fy', fy);
      if (forceRecalculate) params.set('force_recalculate', 'true');

      const url = params.toString() ? `/api/capital-gains?${params.toString()}` : '/api/capital-gains';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch capital gains: ${response.statusText}`);
      }

      const result: CapitalGainsData = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching capital gains:', err);
    } finally {
      setLoading(false);
    }
  }, [fy]);

  useEffect(() => {
    if (enabled) {
      fetchCapitalGains();
    }
  }, [fetchCapitalGains, refreshKey, enabled]);

  const refetch = useCallback(() => {
    fetchCapitalGains(false);
  }, [fetchCapitalGains]);

  const forceRefetch = useCallback(() => {
    fetchCapitalGains(true);
  }, [fetchCapitalGains]);

  return { data, loading, error, refetch, forceRefetch };
}
