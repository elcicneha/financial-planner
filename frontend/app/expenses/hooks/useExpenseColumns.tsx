import { useMemo } from "react";
import { ColumnConfig } from "@/components/EditableTable/types";
import { Expense } from "../types/expense";
import { CATEGORIES, getToday } from "../utils/constants";
import { validateExpenseAmount } from "../utils/validation";
import { FormulaBar } from "../components/FormulaBar";

export function useExpenseColumns(): ColumnConfig<Expense>[] {
  return useMemo<ColumnConfig<Expense>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        width: "120px",
        type: "date",
        editable: true,
        defaultValue: getToday(),
        format: (value) => value,
      },
      {
        key: "amount",
        header: "Amount",
        width: "100px",
        type: "number",
        editable: true,
        formulaBar: true,
        formulaBarRenderer: (props) => <FormulaBar {...props} />,
        validate: (value) => {
          const result = validateExpenseAmount(value);
          return {
            isValid: result.isValid,
            error: result.error,
          };
        },
        format: (value) => (
          <div className="p-3 font-mono tabular-nums font-medium">
            {typeof value === "number"
              ? value.toLocaleString("en-IN", { minimumFractionDigits: 2 })
              : value}
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        width: "130px",
        type: "select",
        editable: true,
        options: [...CATEGORIES],
        format: (value) => (
          <div className="p-3">
            <span className="px-2 py-1 rounded-md bg-muted text-xs">{value}</span>
          </div>
        ),
      },
      {
        key: "note",
        header: "Note",
        type: "text",
        editable: true,
        format: (value) => <div className="p-3">{value || "—"}</div>,
      },
    ],
    []
  );
}
