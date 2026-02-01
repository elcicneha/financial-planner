export interface Expense {
  id: string;
  date: string;
  amount: number;
  amountFormula?: string;
  note: string;
  category: string;
}

export interface EditingRow {
  date: string;
  amount: string;
  note: string;
  category: string;
}
