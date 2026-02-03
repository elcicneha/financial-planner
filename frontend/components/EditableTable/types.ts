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
  onRowChange?: (data: Partial<T>) => void; // Update multiple fields at once
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface RowExtensionProps<T> {
  row: T;
  isEditing: boolean;
  editData: Partial<T>;
  onDataChange: (data: Partial<T>) => void;
}

type BaseColumnConfig<T> = {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  editable?: boolean;
  defaultValue?: any; // Default value for new rows
  validate?: (value: any) => ValidationResult;
  format?: (value: any, row: T) => string | number; // Data transformation only (no JSX)
  cellRenderer?: (props: CellRendererProps<T>) => ReactNode; // For custom UI rendering
  formulaBar?: boolean; // Enable formula bar for this column
  formulaBarRenderer?: (props: FormulaBarProps) => ReactNode; // Custom formula bar
};

// Type-specific configurations
type SelectColumnConfig<T> = BaseColumnConfig<T> & {
  type: "select";
  variant?: "dropdown" | "tabs"; // UI presentation (only for select type)
  options?: string[];
};

type FormulaColumnConfig<T> = BaseColumnConfig<T> & {
  type: "formula";
  evaluate: (value: string) => { value: number; error?: string };
};

type NonSelectColumnConfig<T> = BaseColumnConfig<T> & {
  type?: "text" | "number" | "date" | "custom";
  options?: string[];
};

export type ColumnConfig<T> = SelectColumnConfig<T> | FormulaColumnConfig<T> | NonSelectColumnConfig<T>;

export interface FormulaBarProps {
  value: string;
  evaluatedValue?: number;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
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
