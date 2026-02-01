"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { EditableTable } from "@/components/EditableTable";
import { Expense } from "../types/expense";
import { generateId } from "../utils/formula";
import { validateExpenseAmount } from "../utils/validation";
import { getToday } from "../utils/constants";
import { useExpenseColumns } from "../hooks/useExpenseColumns";

export function ExcelTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const columns = useExpenseColumns();

  const handleAdd = useCallback((data: Partial<Expense>) => {
    // Validate and parse amount (convert to string for validation)
    const amountString = String(data.amount ?? "");
    const validation = validateExpenseAmount(amountString);

    if (!validation.isValid || !validation.value) {
      return;
    }

    const newExpense: Expense = {
      id: generateId(),
      date: data.date || getToday(),
      amount: validation.value,
      amountFormula: validation.formula,
      note: (data.note || "").trim(),
      category: data.category || "Unknown",
    };

    setExpenses((prev) => [newExpense, ...prev]);
    toast.success("Expense added");
  }, []);

  const handleEdit = useCallback((id: string, data: Partial<Expense>) => {
    // Validate and parse amount (convert to string for validation)
    const amountString = String(data.amount ?? "");
    const validation = validateExpenseAmount(amountString);

    if (!validation.isValid || !validation.value) {
      return;
    }

    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              date: data.date || expense.date,
              amount: validation.value!,
              amountFormula: validation.formula,
              note: (data.note || "").trim(),
              category: data.category || expense.category,
            }
          : expense
      )
    );

    toast.success("Expense updated");
  }, []);

  const handleDelete = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    toast.success("Expense deleted");
  }, []);

  return (
    <EditableTable
      data={expenses}
      columns={columns}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      keyExtractor={(row) => row.id}
      features={{
        adding: true,
        editing: true,
        deleting: true,
        keyboardNav: true,
      }}
      emptyState={
        <span>No expenses yet. Click &quot;Add Row&quot; to start.</span>
      }
    />
  );
}
