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

const CATEGORIES = [
  "Unknown",
  "Eating Out",
  "Grocery",
  "Entertainment",
  "Rent",
  "Utilities",
  "Others",
];

export default function ExpensesPage() {
  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("Unknown");

  const handleSubmit = (e: React.FormEvent) => {
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

    // For now, just log the expense (no backend yet)
    console.log({
      amount: parseFloat(amount),
      note: note.trim() || undefined,
      date,
      category,
    });

    toast.success("Expense added successfully");

    // Reset form
    setAmount("");
    setNote("");
    setDate(today);
    setCategory("Unknown");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Expenses</h1>

      <Card className="shadow-sm">
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
              <Button type="submit" className="w-full md:w-auto">
                Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
