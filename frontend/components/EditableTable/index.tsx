"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableTableProps } from "./types";
import { useTableState } from "./hooks/useTableState";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { EditableRow } from "./components/EditableRow";
import { ViewRow } from "./components/ViewRow";
import { Cell } from "./components/Cell";
import { Card, CardContent } from "../ui/card";

function EditableTableComponent<T>({
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  rowActions,
  emptyState,
  keyExtractor,
  defaultSort,
  features = {},
}: EditableTableProps<T>) {
  const {
    adding = false,
    editing = false,
    deleting = false,
    keyboardNav = false,
  } = features;

  const [focusedColumn, setFocusedColumn] = useState<string | null>(null);

  const {
    editingId,
    isAdding,
    editData,
    fieldErrors,
    sortedData,
    emptyRow,
    handleStartAdding,
    handleCancelAdding,
    handleStartEditing,
    handleCancelEditing,
    updateEditData,
    setError,
    setEditData,
  } = useTableState({
    data,
    columns,
    keyExtractor,
    defaultSort,
  });

  // Validate all fields
  const validateFields = useCallback(
    (dataToValidate: Partial<T>): boolean => {
      let isValid = true;
      const errors: Record<string, string> = {};

      columns.forEach((col) => {
        if (col.editable && col.validate) {
          const value = (dataToValidate as any)[col.key];
          const result = col.validate(value);

          if (!result.isValid) {
            errors[col.key] = result.error || "Invalid value";
            isValid = false;
          }
        }
      });

      // Set all errors at once
      Object.entries(errors).forEach(([key, error]) => {
        setError(key, error);
      });

      return isValid;
    },
    [columns, setError]
  );

  // Handle confirm add
  const handleConfirmAdd = useCallback(async () => {
    if (!validateFields(editData)) {
      return;
    }

    if (onAdd) {
      await onAdd(editData);
      setEditData(emptyRow);
      setFocusedColumn(null);
      // Keep adding mode open for next entry
    }
  }, [editData, onAdd, validateFields, emptyRow, setEditData]);

  // Handle confirm edit
  const handleConfirmEdit = useCallback(async () => {
    if (!validateFields(editData)) {
      return;
    }

    if (onEdit && editingId) {
      await onEdit(editingId, editData);
      handleCancelEditing();
      setFocusedColumn(null);
    }
  }, [editData, editingId, onEdit, validateFields, handleCancelEditing]);

  // Handle delete
  const handleDeleteRow = useCallback(
    (row: T) => {
      if (onDelete) {
        const id = keyExtractor(row);
        onDelete(id);
      }
    },
    [onDelete, keyExtractor]
  );

  // Keyboard navigation
  const { handleKeyDown, handleDateKeyDown } = useKeyboardNav({
    onConfirm: isAdding ? handleConfirmAdd : handleConfirmEdit,
    onCancel: () => {
      if (isAdding) {
        handleCancelAdding();
      } else {
        handleCancelEditing();
      }
      setFocusedColumn(null);
    },
    enabled: keyboardNav,
  });

  return (
    <div className="space-y-4">
      {/* Add button */}
      {adding && (
        <div className="flex justify-end">
          {!isAdding ? (
            <Button onClick={handleStartAdding} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleConfirmAdd} size="sm" className="gap-1">
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Confirm</span>
              </Button>
              <Button
                onClick={() => {
                  handleCancelAdding();
                  setFocusedColumn(null);
                }}
                size="sm"
                variant="outline"
                className="gap-1"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden @container">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    style={{ width: col.width }}
                    className={col.type === "number" ? "text-right" : ""}
                  >
                    {col.header}
                  </TableHead>
                ))}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Add row */}
              {isAdding && (
                <EditableRow
                  columns={columns}
                  data={editData}
                  errors={fieldErrors}
                  onChange={updateEditData}
                  onConfirm={handleConfirmAdd}
                  onCancel={() => {
                    handleCancelAdding();
                    setFocusedColumn(null);
                  }}
                  handleKeyDown={handleKeyDown}
                  handleDateKeyDown={handleDateKeyDown}
                  focusedColumn={focusedColumn}
                  onColumnFocus={setFocusedColumn}
                  onColumnBlur={() => setFocusedColumn(null)}
                />
              )}

              {/* Data rows */}
              {sortedData.map((row) => {
                const rowId = keyExtractor(row);
                const isEditing = editingId === rowId;

                if (isEditing && editing) {
                  return (
                    <EditableRow
                      key={rowId}
                      columns={columns}
                      data={editData}
                      errors={fieldErrors}
                      onChange={updateEditData}
                      onConfirm={handleConfirmEdit}
                      onCancel={() => {
                        handleCancelEditing();
                        setFocusedColumn(null);
                      }}
                      handleKeyDown={handleKeyDown}
                      handleDateKeyDown={handleDateKeyDown}
                      focusedColumn={focusedColumn}
                      onColumnFocus={setFocusedColumn}
                      onColumnBlur={() => setFocusedColumn(null)}
                    />
                  );
                }

                return (
                  <ViewRow
                    key={rowId}
                    row={row}
                    columns={columns}
                    onEdit={editing ? () => handleStartEditing(row) : undefined}
                    onDelete={deleting ? () => handleDeleteRow(row) : undefined}
                    customActions={rowActions?.(row)}
                  />
                );
              })}

              {/* Empty state */}
              {!isAdding && sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">
                    {emptyState || "No data yet. Click \"Add Row\" to start."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Compound component pattern - attach subcomponents to EditableTable
type EditableTableType = typeof EditableTableComponent & {
  Cell: typeof Cell;
  Row: typeof EditableRow;
  ViewRow: typeof ViewRow;
};

export const EditableTable = EditableTableComponent as EditableTableType;
EditableTable.Cell = Cell;
EditableTable.Row = EditableRow;
EditableTable.ViewRow = ViewRow;

// Export types
export type {
  EditableTableProps,
  ColumnConfig,
  ValidationResult,
  CellRendererProps,
  EditableTableFeatures,
  RowExtensionProps,
  FormulaBarProps,
} from "./types";
