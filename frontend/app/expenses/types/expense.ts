export interface SplitDetails {
  user: number;
  flatmate: number;
  shared: number;
}

export type SplitType = "personal" | "shared" | "mix";

export interface Expense {
  id: string;
  date: string;
  amount: number;
  amountFormula?: string;
  note: string;
  category: string;
  paidBy: "user" | "flatmate";
  splitType: SplitType;
  splits: SplitDetails;
}

export interface EditingRow {
  date: string;
  amount: string;
  note: string;
  category: string;
}
