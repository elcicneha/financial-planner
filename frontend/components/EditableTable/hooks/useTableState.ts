import { useState, useCallback, useMemo } from "react";
import { ColumnConfig } from "../types";

export interface UseTableStateProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  keyExtractor: (row: T) => string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
}

export function useTableState<T>({
  data,
  columns,
  keyExtractor,
  defaultSort,
}: UseTableStateProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key || null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    defaultSort?.direction || "asc"
  );

  // Create empty row template from columns
  const emptyRow = useMemo(() => {
    const row: any = {};
    columns.forEach((col) => {
      // Use defaultValue if provided
      if (col.defaultValue !== undefined) {
        row[col.key] = col.defaultValue;
      } else if (col.type === "select" && col.options && col.options.length > 0) {
        row[col.key] = col.options[0];
      } else {
        row[col.key] = "";
      }
    });
    return row as Partial<T>;
  }, [columns]);

  const [editData, setEditData] = useState<Partial<T>>(emptyRow);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDirection("asc");
      return key;
    });
  }, []);

  const handleStartAdding = useCallback(() => {
    setEditData(emptyRow);
    setFieldErrors({});
    setIsAdding(true);
  }, [emptyRow]);

  const handleCancelAdding = useCallback(() => {
    setIsAdding(false);
    setEditData(emptyRow);
    setFieldErrors({});
  }, [emptyRow]);

  const handleStartEditing = useCallback(
    (row: T) => {
      const id = keyExtractor(row);
      setEditingId(id);
      setEditData({ ...row });
      setFieldErrors({});
    },
    [keyExtractor]
  );

  const handleCancelEditing = useCallback(() => {
    setEditingId(null);
    setEditData(emptyRow);
    setFieldErrors({});
  }, [emptyRow]);

  const updateEditData = useCallback((key: string, value: any) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const setError = useCallback((key: string, error: string) => {
    setFieldErrors((prev) => ({ ...prev, [key]: error }));
  }, []);

  return {
    // State
    editingId,
    isAdding,
    editData,
    fieldErrors,
    sortKey,
    sortDirection,
    sortedData,
    emptyRow,

    // Actions
    handleSort,
    handleStartAdding,
    handleCancelAdding,
    handleStartEditing,
    handleCancelEditing,
    updateEditData,
    setError,
    setEditData,
  };
}
