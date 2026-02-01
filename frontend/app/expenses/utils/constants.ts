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

export const getToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
