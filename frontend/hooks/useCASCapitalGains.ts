import { useState, useEffect, useCallback } from 'react';

export interface CASCategoryData {
  sale_consideration: number;
  acquisition_cost: number;
  gain_loss: number;
}

export interface CASTransaction {
  fund_name: string;
  asset_type: string;  // "EQUITY" or "DEBT"
  term: string;  // "short" or "long"
  folio: string;
  buy_date: string;
  sell_date: string;
  units: number;
  buy_nav: number;
  sell_nav: number;
  sale_consideration: number;
  acquisition_cost: number;
  gain_loss: number;
}

export interface CASCapitalGainsData {
  equity_short_term: CASCategoryData;
  equity_long_term: CASCategoryData;
  debt_short_term: CASCategoryData;
  debt_long_term: CASCategoryData;
  transactions: CASTransaction[];
  has_files: boolean;
  last_updated: string;
}

interface UseCASCapitalGainsResult {
  data: CASCapitalGainsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCASCapitalGains(financialYear?: string, refreshKey = 0): UseCASCapitalGainsResult {
  const [data, setData] = useState<CASCapitalGainsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCASCapitalGains = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = financialYear
        ? `/api/capital-gains-cas?fy=${encodeURIComponent(financialYear)}`
        : '/api/capital-gains-cas';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch CAS capital gains: ${response.statusText}`);
      }

      const result: CASCapitalGainsData = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching CAS capital gains:', err);
    } finally {
      setLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    fetchCASCapitalGains();
  }, [fetchCASCapitalGains, refreshKey]);

  const refetch = useCallback(() => {
    fetchCASCapitalGains();
  }, [fetchCASCapitalGains]);

  return { data, loading, error, refetch };
}
