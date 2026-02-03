import { useMemo, useState } from "react";
import { ColumnConfig } from "@/components/EditableTable/types";
import { Expense, SplitDetails, SplitType } from "../types/expense";
import { CATEGORIES, getToday } from "../utils/constants";
import { evaluateFormula } from "../utils/formula";
import { FormulaBar } from "../components/FormulaBar";
import { SplitEditor } from "../components/SplitEditor";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Handshake, Scissors } from "lucide-react";

// Constant for default splits (avoids creating new object on every render)
const DEFAULT_SPLITS: SplitDetails = { user: 0, flatmate: 0, shared: 0 };

// Split Type Cell Renderer Component
function SplitTypeCell({ value, row, onChange, onRowChange, isEditing }: any) {
  const [showSplitEditor, setShowSplitEditor] = useState(false);

  // value is editData.splitType (or row.splitType in view mode)
  const currentSplitType: SplitType = value || row?.splitType || "personal";

  // View mode - show only the icon
  if (!isEditing) {
    const viewSplitType: SplitType = row?.splitType || "personal";
    const getDisplayContent = () => {
      switch (viewSplitType) {
        case "personal":
          return <User className="h-4 w-4 inline-block" />;
        case "shared":
          return <Handshake className="h-4 w-4 inline-block" />;
        case "mix":
          return <Scissors className="h-4 w-4 inline-block" />;
      }
    };

    return <div className="flex items-center">{getDisplayContent()}</div>;
  }

  const handleSplitTypeClick = (type: SplitType) => {
    if (type === "mix") {
      setShowSplitEditor(true);
    } else {
      // For personal/shared, just update the splitType
      onChange(type);
    }
  };

  const handleSplitSave = (splits: SplitDetails) => {
    if (!onRowChange) return;
    // For mix, update both splitType and splits
    onRowChange({ splitType: "mix", splits });
    setShowSplitEditor(false);
  };

  if (showSplitEditor && row) {
    return (
      <div className="py-2">
        <SplitEditor
          totalAmount={row.amount || 0}
          initialSplits={row.splits || DEFAULT_SPLITS}
          onSave={handleSplitSave}
          onCancel={() => setShowSplitEditor(false)}
        />
      </div>
    );
  }

  // Edit mode - show full tabs
  return (
    <Tabs value={currentSplitType} onValueChange={(value) => handleSplitTypeClick(value as SplitType)}>
      <TabsList className="h-9">
        <TabsTrigger value="personal" className="px-2">
          <User className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="shared" className="px-2">
          <Handshake className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="mix" className="px-2">
          <Scissors className="h-4 w-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

// Paid By Cell Renderer Component
function PaidByCell({ value, row, onChange, isEditing }: any) {
  // FIX: Use value (editData.paidBy) for controlled component pattern
  const currentPaidBy = value || row?.paidBy || "user";

  // View mode - show only the text
  if (!isEditing) {
    const viewPaidBy = row?.paidBy || "user";
    return (
      <div className="text-sm">
        {viewPaidBy === "user" ? "Me" : "Flatmate"}
      </div>
    );
  }

  const handleChange = (value: string) => {
    if (!onChange) return;
    onChange(value);
  };

  // Edit mode - show full tabs controlled by currentPaidBy
  return (
    <Tabs value={currentPaidBy} onValueChange={handleChange}>
      <TabsList className="h-9">
        <TabsTrigger value="user" className="px-3 text-xs">
          Me
        </TabsTrigger>
        <TabsTrigger value="flatmate" className="px-3 text-xs">
          Flatmate
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

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
        type: "formula",
        editable: true,
        evaluate: evaluateFormula,
        formulaBarRenderer: (props) => <FormulaBar {...props} />,
        validate: (value) => {
          // Value is now the evaluated number
          if (typeof value !== "number" || value === 0) {
            return { isValid: false, error: "Please enter a valid amount" };
          }
          return { isValid: true };
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
      {
        key: "splitType",
        header: "Split",
        width: "140px",
        type: "custom",
        editable: true,
        defaultValue: "personal",
        cellRenderer: (props) => <SplitTypeCell {...props} />,
      },
      {
        key: "paidBy",
        header: "Paid By",
        width: "100px",
        type: "select", // Data layer: it's a select field
        options: ["user", "flatmate"], // Valid data values
        editable: true,
        defaultValue: "user",
        cellRenderer: (props) => <PaidByCell {...props} />, // UI layer: custom rendering
      },
      {
        key: "yourShare",
        header: "Your Share",
        width: "100px",
        type: "number",
        editable: false,
        cellRenderer: ({ row }) => {
          const amount = typeof row?.amount === "number" ? row.amount : 0;
          const splitType: SplitType = row?.splitType || "personal";

          // Calculate yourShare based on splitType
          let yourShare = 0;

          if (splitType === "personal") {
            // Personal expense - you pay full amount
            yourShare = amount;
          } else if (splitType === "shared") {
            // Shared expense - you pay half
            yourShare = amount * 0.5;
          } else if (splitType === "mix") {
            // Mix - use actual splits from SplitEditor
            const splits = row?.splits || DEFAULT_SPLITS;
            yourShare = (Number(splits.user) || 0) + ((Number(splits.shared) || 0) * 0.5);
          }

          return (
            <div className="number-format">
              ₹{yourShare.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
    ],
    []
  );
}
