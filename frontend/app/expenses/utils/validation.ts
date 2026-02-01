import { evaluateFormula } from "./formula";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: number;
  formula?: string;
}

/**
 * Validate and parse expense amount (supports formulas)
 */
export function validateExpenseAmount(amountInput: string): ValidationResult {
  if (!amountInput || amountInput.trim() === "") {
    return {
      isValid: false,
      error: "Please enter an amount",
    };
  }

  const evaluation = evaluateFormula(amountInput);

  if (evaluation.error) {
    return {
      isValid: false,
      error: evaluation.error,
    };
  }

  if (evaluation.value === 0) {
    return {
      isValid: false,
      error: "Amount cannot be zero",
    };
  }

  // Check if it's a formula (contains operators)
  const hasOperators = /[+\-*/()]/.test(amountInput.replace(/^-/, ""));

  return {
    isValid: true,
    value: evaluation.value,
    formula: hasOperators ? amountInput.trim() : undefined,
  };
}
