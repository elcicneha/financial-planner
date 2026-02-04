"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CirclePlus, Check, X } from "lucide-react";
import { SplitDetails } from "../types/expense";

interface SplitEditorProps {
  totalAmount: number;
  initialSplits?: SplitDetails;
  onSave: (splits: SplitDetails) => void;
  onCancel: () => void;
}

type FieldType = "user" | "flatmate" | "shared";

export function SplitEditor({
  totalAmount,
  initialSplits,
  onSave,
  onCancel,
}: SplitEditorProps) {
  const [splits, setSplits] = useState<SplitDetails>({
    user: Number(initialSplits?.user) || 0,
    flatmate: Number(initialSplits?.flatmate) || 0,
    shared: Number(initialSplits?.shared) || 0,
  });
  const [allField, setAllField] = useState<FieldType | null>(null);

  const currentTotal =
    (Number(splits.user) || 0) +
    (Number(splits.flatmate) || 0) +
    (Number(splits.shared) || 0);
  const isValid = Math.abs(currentTotal - totalAmount) < 0.01;

  const handleAllClick = (field: FieldType) => {
    setSplits({
      user: field === "user" ? totalAmount : 0,
      flatmate: field === "flatmate" ? totalAmount : 0,
      shared: field === "shared" ? totalAmount : 0,
    });
    setAllField(field);
  };

  const handleFieldChange = (field: FieldType, value: string) => {
    const numValue = parseFloat(value) || 0;

    if (allField && field !== allField) {
      // Auto-adjust the "all" field when typing in other fields
      const newSplits = {
        ...splits,
        [field]: numValue,
      };

      // Calculate sum of all fields except the "all" field
      const otherFieldsSum =
        (allField !== "user" ? newSplits.user : 0) +
        (allField !== "flatmate" ? newSplits.flatmate : 0) +
        (allField !== "shared" ? newSplits.shared : 0);

      // Remaining goes to the "all" field
      const remaining = Math.max(0, totalAmount - otherFieldsSum);

      setSplits({
        ...newSplits,
        [allField]: remaining,
      });
    } else {
      // Normal edit (no auto-adjust)
      setSplits({
        ...splits,
        [field]: numValue,
      });

      // Clear allField if the all field is manually edited
      if (field === allField) {
        setAllField(null);
      }
    }
  };

  const renderField = (
    field: FieldType,
    label: string,
    value: number
  ) => (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Label htmlFor={field} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex gap-1 mt-1">
          <Input
            id={field}
            type="number"
            value={value || ""}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder="0"
            className="flex-1"
            step="0.01"
          />
          <Button
            type="button"
            variant={allField === field ? "primary" : "outline"}
            size="icon"
            onClick={() => handleAllClick(field)}
            title="Fill with total amount"
          >
            <CirclePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground min-w-[60px] text-right pt-6">
        ₹{(Number(value) || 0).toFixed(2)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 min-w-[320px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Split ₹{totalAmount.toFixed(2)}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span
            className={`text-sm font-medium ${
              isValid ? "text-green-600" : "text-red-600"
            }`}
          >
            ₹{currentTotal.toFixed(2)}
          </span>
          {isValid ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {renderField("user", "Mine", splits.user)}
        {renderField("flatmate", "Flatmate", splits.flatmate)}
        {renderField("shared", "Shared (50/50)", splits.shared)}
      </div>

      {!isValid && (
        <p className="text-xs text-red-600">
          Total must equal ₹{totalAmount.toFixed(2)}. Difference: ₹
          {Math.abs(currentTotal - totalAmount).toFixed(2)}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(splits)}
          disabled={!isValid}
        >
          Save Split
        </Button>
      </div>
    </div>
  );
}
