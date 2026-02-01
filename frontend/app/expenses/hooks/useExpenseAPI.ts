import { Expense } from "../types/expense";

const API_BASE = "/api";

export const expenseAPI = {
  async getAll(): Promise<Expense[]> {
    const response = await fetch(`${API_BASE}/expenses`);
    if (!response.ok) {
      throw new Error("Failed to fetch expenses");
    }
    const data = await response.json();
    return data.expenses;
  },

  async create(expense: Omit<Expense, "id">): Promise<Expense> {
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
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create expense");
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
    };
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
