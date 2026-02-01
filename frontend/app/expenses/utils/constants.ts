export const CATEGORIES = [
  "Unknown",
  "Eating Out",
  "Grocery",
  "Entertainment",
  "Rent",
  "Utilities",
  "Others",
] as const;

export const FORMULA_SYMBOLS = ["(", ")", "+", "-", "*", "/"] as const;

export const getToday = () => new Date().toISOString().split("T")[0];
