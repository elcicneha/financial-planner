import { useState, useEffect, useCallback } from 'react';

export interface CASFileInfo {
  financial_year: string;
  file_path: string;
  upload_date: string;
  file_size: number;
}

interface UseCASFilesResult {
  files: CASFileInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCASFiles(refreshKey = 0): UseCASFilesResult {
  const [files, setFiles] = useState<CASFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCASFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cas-files');

      if (!response.ok) {
        throw new Error(`Failed to fetch CAS files: ${response.statusText}`);
      }

      const result = await response.json();
      setFiles(result.files || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching CAS files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCASFiles();
  }, [fetchCASFiles, refreshKey]);

  const refetch = useCallback(() => {
    fetchCASFiles();
  }, [fetchCASFiles]);

  return { files, loading, error, refetch };
}
