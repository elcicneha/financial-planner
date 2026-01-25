import { useState, useEffect, useCallback } from 'react';

export interface CASCategoryData {
  sale_consideration: number;
  acquisition_cost: number;
  gain_loss: number;
}

export interface CASCapitalGainsData {
  equity_short_term: CASCategoryData;
  equity_long_term: CASCategoryData;
  debt_short_term: CASCategoryData;
  debt_long_term: CASCategoryData;
}

interface UseCASCapitalGainsResult {
  data: CASCapitalGainsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCASCapitalGains(refreshKey = 0): UseCASCapitalGainsResult {
  const [data, setData] = useState<CASCapitalGainsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCASCapitalGains = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/capital-gains-cas');

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
  }, []);

  useEffect(() => {
    fetchCASCapitalGains();
  }, [fetchCASCapitalGains, refreshKey]);

  const refetch = useCallback(() => {
    fetchCASCapitalGains();
  }, [fetchCASCapitalGains]);

  return { data, loading, error, refetch };
}
