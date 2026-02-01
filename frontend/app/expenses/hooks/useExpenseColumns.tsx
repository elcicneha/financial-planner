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
        format: (value) =>
          typeof value === "number"
            ? value.toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : value,
      },
      {
        key: "category",
        header: "Category",
        width: "130px",
        type: "select",
        editable: true,
        options: [...CATEGORIES],
      },
      {
        key: "note",
        header: "Note",
        type: "text",
        editable: true,
      },
    ],
    []
  );
}
