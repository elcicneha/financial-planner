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
import { Plus, Check, X, Trash2, Pencil } from "lucide-react";
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
  amountFormula?: string; // Store formula if user entered one
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

// Safely evaluate a mathematical formula
function evaluateFormula(input: string): { value: number; error?: string } {
  const trimmed = input.trim();

  // If it doesn't start with =, treat as regular number
  if (!trimmed.startsWith("=")) {
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      return { value: 0, error: "Invalid number" };
    }
    return { value: parsed };
  }

  // Extract the formula (everything after =)
  let formula = trimmed.slice(1).trim();

  // Basic validation - only allow numbers, operators, parentheses, and decimal points
  if (!/^[0-9+\-*/().\s]+$/.test(formula)) {
    return { value: 0, error: "Formula contains invalid characters" };
  }

  // Remove leading zeros from numbers to avoid octal literal issues in strict mode
  // Match numbers and replace those with leading zeros (but keep "0" and "0.x")
  formula = formula.replace(/\b0+(\d+)/g, "$1");

  try {
    // Evaluate the formula safely
    // Using Function constructor is safer than eval for simple math
    const result = new Function(`'use strict'; return (${formula})`)();

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { value: 0, error: "Formula resulted in invalid number" };
    }

    return { value: result };
  } catch (error) {
    return { value: 0, error: "Invalid formula" };
  }
}

export function ExcelTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<EditingRow>(emptyRow);
  const [editRow, setEditRow] = useState<EditingRow>(emptyRow);
  const [showFormulaBar, setShowFormulaBar] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const editAmountRef = useRef<HTMLInputElement>(null);
  const editDateRef = useRef<HTMLInputElement>(null);
  const editNoteRef = useRef<HTMLInputElement>(null);

  // Focus date field when adding starts
  useEffect(() => {
    if (isAdding && dateRef.current) {
      dateRef.current.focus();
    }
  }, [isAdding]);

  // Focus date field when editing starts
  useEffect(() => {
    if (editingId && editDateRef.current) {
      editDateRef.current.focus();
    }
  }, [editingId]);

  const insertSymbol = (symbol: string, isNewRow: boolean) => {
    const inputRef = isNewRow ? amountRef : editAmountRef;
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = isNewRow ? newRow.amount : editRow.amount;
    const newValue =
      currentValue.substring(0, start) + symbol + currentValue.substring(end);

    if (isNewRow) {
      setNewRow((r) => ({ ...r, amount: newValue }));
    } else {
      setEditRow((r) => ({ ...r, amount: newValue }));
    }

    // Set cursor position after inserted symbol and ensure it's visible
    setTimeout(() => {
      input.focus();
      const newPosition = start + symbol.length;
      input.setSelectionRange(newPosition, newPosition);

      // Force scroll to cursor position
      input.scrollLeft = input.scrollWidth;
    }, 0);
  };

  const handleAddRow = () => {
    setNewRow({ ...emptyRow, date: today });
    setIsAdding(true);
  };

  const handleConfirmNew = () => {
    if (!newRow.amount || newRow.amount.trim() === "") {
      toast.error("Please enter an amount");
      amountRef.current?.focus();
      return;
    }

    const evaluation = evaluateFormula(newRow.amount);

    if (evaluation.error) {
      toast.error(evaluation.error);
      amountRef.current?.focus();
      return;
    }

    if (evaluation.value <= 0) {
      toast.error("Amount must be greater than 0");
      amountRef.current?.focus();
      return;
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      date: newRow.date || today,
      amount: evaluation.value,
      amountFormula: newRow.amount.trim().startsWith("=")
        ? newRow.amount.trim()
        : undefined,
      note: newRow.note.trim(),
      category: newRow.category,
    };

    setExpenses((prev) => [expense, ...prev]);
    setNewRow({ ...emptyRow, date: today });
    toast.success("Expense added");

    // Keep adding mode open, focus date for next entry
    setTimeout(() => dateRef.current?.focus(), 50);
  };

  const handleCancelNew = () => {
    setIsAdding(false);
    setNewRow(emptyRow);
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditRow({
      date: expense.date,
      amount: expense.amountFormula || expense.amount.toString(),
      note: expense.note,
      category: expense.category,
    });
  };

  const handleConfirmEdit = () => {
    if (!editRow.amount || editRow.amount.trim() === "") {
      toast.error("Please enter an amount");
      editAmountRef.current?.focus();
      return;
    }

    const evaluation = evaluateFormula(editRow.amount);

    if (evaluation.error) {
      toast.error(evaluation.error);
      editAmountRef.current?.focus();
      return;
    }

    if (evaluation.value <= 0) {
      toast.error("Amount must be greater than 0");
      editAmountRef.current?.focus();
      return;
    }

    setExpenses((prev) =>
      prev.map((e) =>
        e.id === editingId
          ? {
              ...e,
              date: editRow.date || today,
              amount: evaluation.value,
              amountFormula: editRow.amount.trim().startsWith("=")
                ? editRow.amount.trim()
                : undefined,
              note: editRow.note.trim(),
              category: editRow.category,
            }
          : e
      )
    );

    setEditingId(null);
    setEditRow(emptyRow);
    toast.success("Expense updated");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditRow(emptyRow);
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success("Expense deleted");
  };

  // Find and focus the next focusable element in the DOM
  const focusNextElement = () => {
    const focusableSelectors = 'input, button, select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement
    );

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
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
        if (isAdding) {
          handleConfirmNew();
        } else if (editingId) {
          handleConfirmEdit();
        }
      }
    }
  };

  const handleDateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      focusNextElement();
    } else if (e.key === "Enter") {
      e.preventDefault();
      focusNextElement();
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
            <Button onClick={handleConfirmNew} size="sm" className="gap-1">
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Confirm</span>
            </Button>
            <Button
              onClick={handleCancelNew}
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
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium w-[120px]">Date</th>
              <th className="text-left p-3 font-medium w-[100px]">Amount</th>
              <th className="text-left p-3 font-medium w-[130px]">Category</th>
              <th className="text-left p-3 font-medium">Note</th>
              <th className="w-[80px]"></th>
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
                    onKeyDown={handleDateKeyDown}
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Input
                    ref={amountRef}
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00 or =100+50"
                    value={newRow.amount}
                    onChange={(e) =>
                      setNewRow((r) => ({ ...r, amount: e.target.value }))
                    }
                    onFocus={() => setShowFormulaBar(true)}
                    onBlur={() => setShowFormulaBar(false)}
                    onKeyDown={(e) => handleKeyDown(e)}
                    className="h-9 font-mono"
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={handleCancelNew}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            )}

            {/* Existing expenses */}
            {expenses.map((expense) => {
              const isEditing = editingId === expense.id;

              if (isEditing) {
                return (
                  <tr key={expense.id} className="border-b bg-primary/5">
                    <td className="p-2">
                      <Input
                        ref={editDateRef}
                        type="date"
                        value={editRow.date}
                        max={today}
                        onChange={(e) =>
                          setEditRow((r) => ({ ...r, date: e.target.value }))
                        }
                        onKeyDown={handleDateKeyDown}
                        className="h-9"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        ref={editAmountRef}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00 or =100+50"
                        value={editRow.amount}
                        onChange={(e) =>
                          setEditRow((r) => ({ ...r, amount: e.target.value }))
                        }
                        onFocus={() => setShowFormulaBar(true)}
                        onBlur={() => setShowFormulaBar(false)}
                        onKeyDown={(e) => handleKeyDown(e)}
                        className="h-9 font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={editRow.category}
                        onValueChange={(v) =>
                          setEditRow((r) => ({ ...r, category: v }))
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
                      <Input
                        ref={editNoteRef}
                        type="text"
                        placeholder="Description..."
                        value={editRow.note}
                        onChange={(e) =>
                          setEditRow((r) => ({ ...r, note: e.target.value }))
                        }
                        onKeyDown={(e) => handleKeyDown(e)}
                        className="h-9"
                      />
                    </td>
                    <td className="p-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600"
                        onClick={handleConfirmEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={expense.id}
                  className="border-b hover:bg-muted/30 transition-colors group"
                >
                  <td className="p-3 text-muted-foreground">
                    {expense.date}
                  </td>
                  <td className="p-3 font-mono tabular-nums font-medium">
                    {expense.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-md bg-muted text-xs">
                      {expense.category}
                    </span>
                  </td>
                  <td className="p-3">{expense.note || "—"}</td>
                  <td className="p-2 flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEdit(expense)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}

            {/* Empty state */}
            {!isAdding && expenses.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No expenses yet. Click &quot;Add Expense&quot; to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formula toolbar - shows when amount field is focused */}
      {showFormulaBar && (
        <div className="sticky bottom-0 bg-background border-t border-b shadow-lg z-10">
          {/* Formula preview */}
          <div className="px-3 py-2 bg-muted/30 border-b">
            <div className="text-xs text-muted-foreground mb-1">
              Current formula:
            </div>
            <div className="font-mono text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-thin">
              {(isAdding ? newRow.amount : editRow.amount) || "(empty)"}
            </div>
          </div>

          {/* Formula buttons */}
          <div className="flex gap-1 p-2 justify-center flex-wrap">
            <span className="text-xs text-muted-foreground self-center mr-2">
              Insert:
            </span>
            {["=", "(", ")", "+", "-", "*", "/"].map((symbol) => (
              <Button
                key={symbol}
                size="sm"
                variant="outline"
                className="h-9 w-10 font-mono font-bold"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertSymbol(symbol, isAdding)}
                type="button"
              >
                {symbol}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile hint */}
      {(isAdding || editingId) && (
        <p className="text-xs text-muted-foreground text-center sm:hidden">
          Swipe table to see all fields. Press Enter to move to next field.
        </p>
      )}
    </div>
  );
}
