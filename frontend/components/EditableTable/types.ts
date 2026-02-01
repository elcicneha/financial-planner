import { ReactNode } from "react";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CellRendererProps<T> {
  value: any;
  row: T;
  column: ColumnConfig<T>;
  isEditing: boolean;
  onChange: (value: any) => void;
  error?: string;
}

export interface RowExtensionProps<T> {
  row: T;
  isEditing: boolean;
  editData: Partial<T>;
  onDataChange: (data: Partial<T>) => void;
}

export interface ColumnConfig<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  editable?: boolean;
  type?: "text" | "number" | "date" | "select" | "custom";
  options?: string[];
  defaultValue?: any; // Default value for new rows
  validate?: (value: any) => ValidationResult;
  format?: (value: any, row: T) => ReactNode;
  cellRenderer?: (props: CellRendererProps<T>) => ReactNode;
  formulaBar?: boolean; // Enable formula bar for this column
  formulaBarRenderer?: (props: FormulaBarProps) => ReactNode; // Custom formula bar
}

export interface FormulaBarProps {
  value: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  cleanFormula?: (value: string) => string;
}

export interface EditableTableFeatures {
  sorting?: boolean;
  adding?: boolean;
  editing?: boolean;
  deleting?: boolean;
  inlineEditing?: boolean;
  keyboardNav?: boolean;
}

export interface EditableTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  onAdd?: (row: Partial<T>) => void | Promise<void>;
  onEdit?: (id: string, row: Partial<T>) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  rowActions?: (row: T) => ReactNode;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  features?: EditableTableFeatures;
}
