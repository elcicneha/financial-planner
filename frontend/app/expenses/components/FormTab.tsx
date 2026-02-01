"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { expenseAPI } from "../hooks/useExpenseAPI";
import { getToday } from "../utils/constants";

const CATEGORIES = [
  "Unknown",
  "Eating Out",
  "Grocery",
  "Entertainment",
  "Rent",
  "Utilities",
  "Others",
];

export function FormTab() {
  const today = getToday();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("Unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);

    try {
      await expenseAPI.create({
        date,
        amount: parseFloat(amount),
        note: note.trim(),
        category,
      });

      toast.success("Expense added successfully");

      // Reset form
      setAmount("");
      setNote("");
      setDate(today);
      setCategory("Unknown");
    } catch (error) {
      toast.error("Failed to add expense");
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Note Field */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              Note
            </Label>
            <Input
              id="note"
              type="text"
              placeholder="e.g., Lunch at cafe"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Date Field */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
