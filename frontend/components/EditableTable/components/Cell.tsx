import { memo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import { ColumnConfig, CellRendererProps } from "../types";
import { Badge } from "@/components/ui/badge";

interface TableCellProps<T> {
  column: ColumnConfig<T>;
  value: any;
  row: T;
  isEditing: boolean;
  onChange: (value: any) => void;
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

function CellInner<T>({
  column,
  value,
  row,
  isEditing,
  onChange,
  error,
  inputRef,
  onKeyDown,
  onFocus,
  onBlur,
}: TableCellProps<T>) {
  // Use custom cell renderer if provided
  if (column.cellRenderer) {
    return <TableCell>{column.cellRenderer({ value, row, column, isEditing, onChange, error })}</TableCell>;
  }

  // View mode
  if (!isEditing) {
    // Format the value if formatter exists (data transformation only)
    const displayValue = column.format ? column.format(value, row) : value;

    // Apply type-specific styling
    switch (column.type) {
      case "number":
        return (
          <TableCell className="text-right">
            <div className="number-format">
              {displayValue || "—"}
            </div>
          </TableCell>
        );

      case "select":
        return (
          <TableCell>
            <Badge>
              {displayValue || "—"}
            </Badge>
          </TableCell>
        );

      case "date":
      case "text":
      default:
        return (
          <TableCell>
            <div >{displayValue || "—"}</div>
          </TableCell>
        );
    }
  }

  // Edit mode - render input based on type
  const commonClasses = `${error ? "border-destructive focus-visible:ring-destructive" : ""}`;

  switch (column.type) {
    case "date":
      return (
        <TableCell className="p-2">
          <Input
            ref={inputRef}
            type="date"
            value={value || ""}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            className={commonClasses}
          />
        </TableCell>
      );

    case "number":
      return (
        <TableCell className="p-2 space-y-1 text-right">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`${commonClasses} number-format text-right`}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </TableCell>
      );

    case "select":
      return (
        <TableCell className="p-2">
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger className={commonClasses}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      );

    case "text":
    default:
      return (
        <TableCell className="p-2">
          <Input
            ref={inputRef}
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            className={commonClasses}
          />
        </TableCell>
      );
  }
}

export const Cell = memo(CellInner) as typeof CellInner;
