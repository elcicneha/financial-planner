"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { EditableTable } from "@/components/EditableTable";
import { Expense } from "../types/expense";
import { validateExpenseAmount } from "../utils/validation";
import { getToday } from "../utils/constants";
import { useExpenseColumns } from "../hooks/useExpenseColumns";
import { expenseAPI } from "../hooks/useExpenseAPI";

export function ExcelTabSplit2() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const columns = useExpenseColumns();

  // Load expenses on mount
  useEffect(() => {
    const loadExpenses = async () => {
      const data = await expenseAPI.getAll();
      setExpenses(data);
      setIsLoading(false);
    };

    loadExpenses();
  }, []);

  const handleAdd = useCallback(async (data: Partial<Expense>) => {
    // Validate and parse amount (convert to string for validation)
    const amountString = String(data.amount ?? "");
    const validation = validateExpenseAmount(amountString);

    if (!validation.isValid || !validation.value) {
      return;
    }

    const newExpenseData = {
      date: data.date || getToday(),
      amount: validation.value,
      amountFormula: validation.formula,
      note: (data.note || "").trim(),
      category: data.category || "Unknown",
      paidBy: data.paidBy || "user",
      splits: data.splits || {
        user: validation.value,
        flatmate: 0,
        shared: 0,
      },
    };

    try {
      const createdExpense = await expenseAPI.create(newExpenseData);
      setExpenses((prev) => [createdExpense, ...prev]);
      toast.success("Expense added");
    } catch (error) {
      toast.error("Failed to add expense");
      console.error("Error adding expense:", error);
    }
  }, []);

  const handleEdit = useCallback(async (id: string, data: Partial<Expense>) => {
    // Validate and parse amount (convert to string for validation)
    const amountString = String(data.amount ?? "");
    const validation = validateExpenseAmount(amountString);

    if (!validation.isValid || !validation.value) {
      return;
    }

    const updateData = {
      date: data.date,
      amount: validation.value,
      amountFormula: validation.formula,
      note: data.note ? data.note.trim() : undefined,
      category: data.category,
    };

    try {
      const updatedExpense = await expenseAPI.update(id, updateData);
      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === id ? updatedExpense : expense
        )
      );
      toast.success("Expense updated");
    } catch (error) {
      toast.error("Failed to update expense");
      console.error("Error updating expense:", error);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await expenseAPI.delete(id);
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      toast.success("Expense deleted");
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error("Error deleting expense:", error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading expenses...</p>
      </div>
    );
  }

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
