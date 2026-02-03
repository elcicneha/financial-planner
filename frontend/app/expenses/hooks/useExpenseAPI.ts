import { Expense } from "../types/expense";

const API_BASE = "/api";

export const expenseAPI = {
  async getAll(): Promise<Expense[]> {
    try {
      const response = await fetch(`${API_BASE}/expenses`);
      if (!response.ok) {
        // If backend isn't running or returns error, return empty array
        console.warn("Could not fetch expenses, using empty state");
        return [];
      }
      const data = await response.json();
      const expenses = data.expenses || [];

      // Convert snake_case to camelCase
      return expenses.map((e: any) => ({
        id: e.id,
        date: e.date,
        amount: e.amount,
        amountFormula: e.amount_formula,
        note: e.note,
        category: e.category,
        paidBy: e.paid_by || "user",
        splitType: e.split_type || "personal",
        splits: e.splits || { user: e.amount, flatmate: 0, shared: 0 },
      }));
    } catch (error) {
      // Network error or JSON parse error - return empty array for initial state
      console.warn("Could not load expenses:", error);
      return [];
    }
  },

  async create(expense: Omit<Expense, "id">): Promise<Expense> {
    try {
      const response = await fetch(`${API_BASE}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: expense.date,
          amount: expense.amount,
          amount_formula: expense.amountFormula,
          note: expense.note,
          category: expense.category,
          paid_by: expense.paidBy,
          split_type: expense.splitType,
          splits: expense.splits,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create expense failed:", response.status, errorText);
        throw new Error(`Failed to create expense: ${response.status}`);
      }

      const data = await response.json();
      // Convert snake_case to camelCase
      return {
        id: data.id,
        date: data.date,
        amount: data.amount,
        amountFormula: data.amount_formula,
        note: data.note,
        category: data.category,
        paidBy: data.paid_by,
        splitType: data.split_type || "personal",
        splits: data.splits,
      };
    } catch (error) {
      console.error("Error creating expense:", error);
      throw error;
    }
  },

  async update(id: string, expense: Partial<Expense>): Promise<Expense> {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: expense.date,
        amount: expense.amount,
        amount_formula: expense.amountFormula,
        note: expense.note,
        category: expense.category,
        paid_by: expense.paidBy,
        split_type: expense.splitType,
        splits: expense.splits,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update expense");
    }

    const data = await response.json();
    // Convert snake_case to camelCase
    return {
      id: data.id,
      date: data.date,
      amount: data.amount,
      amountFormula: data.amount_formula,
      note: data.note,
      category: data.category,
      paidBy: data.paid_by,
      splitType: data.split_type || "personal",
      splits: data.splits,
    };
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete expense");
    }
  },

  async deleteAll(): Promise<void> {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete all expenses");
    }
  },
};
