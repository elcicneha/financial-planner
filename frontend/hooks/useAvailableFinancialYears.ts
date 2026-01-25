import { useState, useEffect } from 'react';

export function useAvailableFinancialYears(refreshKey = 0) {
  const [financialYears, setFinancialYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFinancialYears() {
      setLoading(true);
      try {
        const response = await fetch('/api/available-financial-years');
        if (response.ok) {
          const data = await response.json();
          setFinancialYears(data.financial_years || []);
        }
      } catch (error) {
        console.error('Error fetching financial years:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFinancialYears();
  }, [refreshKey]);

  return { financialYears, loading };
}
