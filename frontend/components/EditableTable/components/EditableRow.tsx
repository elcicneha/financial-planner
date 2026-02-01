import { memo, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Cell } from "./Cell";
import { ColumnConfig } from "../types";

interface EditableRowProps<T> {
  columns: ColumnConfig<T>[];
  data: Partial<T>;
  errors: Record<string, string>;
  onChange: (key: string, value: any) => void;
  onConfirm: () => void;
  onCancel: () => void;
  handleKeyDown?: (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => void;
  handleDateKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  focusedColumn?: string | null;
  onColumnFocus?: (columnKey: string) => void;
  onColumnBlur?: () => void;
}

function EditableRowInner<T>({
  columns,
  data,
  errors,
  onChange,
  onConfirm,
  onCancel,
  handleKeyDown,
  handleDateKeyDown,
  focusedColumn,
  onColumnFocus,
  onColumnBlur,
}: EditableRowProps<T>) {
  // Create refs for each editable field (memoized to avoid recreating on every render)
  const fieldRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLInputElement>> = {};
    columns.forEach((col) => {
      if (col.editable) {
        refs[col.key] = { current: null };
      }
    });
    return refs;
  }, [columns]);

  // Focus first editable field when row mounts
  useEffect(() => {
    const firstEditableCol = columns.find((col) => col.editable);
    if (firstEditableCol && fieldRefs[firstEditableCol.key]?.current) {
      fieldRefs[firstEditableCol.key].current?.focus();
    }
  }, [columns, fieldRefs]);

  // Get next field ref for keyboard navigation
  const getNextFieldRef = (currentKey: string): React.RefObject<HTMLInputElement | null> | undefined => {
    const editableColumns = columns.filter((col) => col.editable);
    const currentIndex = editableColumns.findIndex((col) => col.key === currentKey);

    if (currentIndex !== -1 && currentIndex < editableColumns.length - 1) {
      const nextCol = editableColumns[currentIndex + 1];
      return fieldRefs[nextCol.key];
    }

    return undefined;
  };

  // Find column with formula bar that is currently focused
  const formulaBarColumn = columns.find(
    (col) => col.formulaBar && col.key === focusedColumn
  );

  return (
    <>
      <TableRow>
        {columns.map((column) => {
          const value = (data as any)[column.key];
          const error = errors[column.key];
          const fieldRef = fieldRefs[column.key];
          const nextRef = getNextFieldRef(column.key);

          return (
            <Cell
              key={column.key}
              column={column}
              value={value}
              row={data as T}
              isEditing={true}
              onChange={(newValue) => onChange(column.key, newValue)}
              error={error}
              inputRef={fieldRef}
              onKeyDown={
                column.type === "date"
                  ? handleDateKeyDown
                  : handleKeyDown
                    ? (e) => handleKeyDown(e, nextRef)
                    : undefined
              }
              onFocus={() => onColumnFocus?.(column.key)}
              onBlur={() => onColumnBlur?.()}
            />
          );
        })}
        <TableCell className="p-2 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-success-text"
            onClick={onConfirm}
          >
            <Check className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive-text"
            onClick={onCancel}
          >
            <X className="size-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Formula bar row (if column has formulaBar enabled and is focused) */}
      {formulaBarColumn && formulaBarColumn.formulaBarRenderer && (
        <TableRow>
          <TableCell colSpan={columns.length + 1}>
            {formulaBarColumn.formulaBarRenderer({
              value: (data as any)[formulaBarColumn.key] || "",
              inputRef: fieldRefs[formulaBarColumn.key],
              onChange: (newValue) => onChange(formulaBarColumn.key, newValue),
            })}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export const EditableRow = memo(EditableRowInner) as typeof EditableRowInner;
