"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Unknown",
  "Eating Out",
  "Grocery",
  "Entertainment",
  "Rent",
  "Utilities",
  "Others",
];

interface Expense {
  id: string;
  date: string;
  amount: number;
  note: string;
  category: string;
}

interface EditingRow {
  date: string;
  amount: string;
  note: string;
  category: string;
}

const today = new Date().toISOString().split("T")[0];

const emptyRow: EditingRow = {
  date: today,
  amount: "",
  note: "",
  category: "Unknown",
};

export function ExcelTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState<EditingRow>(emptyRow);

  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Focus date field when adding starts
  useEffect(() => {
    if (isAdding && dateRef.current) {
      dateRef.current.focus();
    }
  }, [isAdding]);

  const handleAddRow = () => {
    setNewRow({ ...emptyRow, date: today });
    setIsAdding(true);
  };

  const handleConfirm = () => {
    if (!newRow.amount || parseFloat(newRow.amount) <= 0) {
      toast.error("Please enter a valid amount");
      amountRef.current?.focus();
      return;
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      date: newRow.date || today,
      amount: parseFloat(newRow.amount),
      note: newRow.note.trim(),
      category: newRow.category,
    };

    setExpenses((prev) => [expense, ...prev]);
    setNewRow({ ...emptyRow, date: today });
    toast.success("Expense added");

    // Keep adding mode open, focus date for next entry
    setTimeout(() => dateRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewRow(emptyRow);
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      } else {
        // Last field - confirm
        handleConfirm();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        {!isAdding ? (
          <Button onClick={handleAddRow} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleConfirm}
              size="sm"
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Confirm</span>
            </Button>
            <Button
              onClick={handleCancel}
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

      {/* Table container with horizontal scroll for mobile */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto border rounded-lg"
      >
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium w-[120px]">Date</th>
              <th className="text-left p-3 font-medium w-[100px]">Amount</th>
              <th className="text-left p-3 font-medium">Note</th>
              <th className="text-left p-3 font-medium w-[130px]">Category</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {/* New row being added */}
            {isAdding && (
              <tr className="border-b bg-primary/5">
                <td className="p-2">
                  <Input
                    ref={dateRef}
                    type="date"
                    value={newRow.date}
                    max={today}
                    onChange={(e) =>
                      setNewRow((r) => ({ ...r, date: e.target.value }))
                    }
                    onKeyDown={(e) => handleKeyDown(e, amountRef)}
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Input
                    ref={amountRef}
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newRow.amount}
                    onChange={(e) =>
                      setNewRow((r) => ({ ...r, amount: e.target.value }))
                    }
                    onKeyDown={(e) => handleKeyDown(e, noteRef)}
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Input
                    ref={noteRef}
                    type="text"
                    placeholder="Description..."
                    value={newRow.note}
                    onChange={(e) =>
                      setNewRow((r) => ({ ...r, note: e.target.value }))
                    }
                    onKeyDown={(e) => handleKeyDown(e)}
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={newRow.category}
                    onValueChange={(v) =>
                      setNewRow((r) => ({ ...r, category: v }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            )}

            {/* Existing expenses */}
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b hover:bg-muted/30 transition-colors"
              >
                <td className="p-3 font-mono text-muted-foreground">
                  {expense.date}
                </td>
                <td className="p-3 font-medium">
                  {expense.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="p-3">{expense.note || "—"}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-md bg-muted text-xs">
                    {expense.category}
                  </span>
                </td>
                <td className="p-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {/* Empty state */}
            {!isAdding && expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No expenses yet. Click &quot;Add Expense&quot; to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile hint */}
      {isAdding && (
        <p className="text-xs text-muted-foreground text-center sm:hidden">
          Swipe table to see all fields. Press Enter to move to next field.
        </p>
      )}
    </div>
  );
}
