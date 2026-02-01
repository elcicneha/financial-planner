/**
 * Generate a unique ID for expenses
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Clean and normalize a formula string
 */
export function cleanFormula(input: string): string {
  let trimmed = input.trim();

  // Check if input contains operators (auto-detect formula)
  const hasOperators = /[+\-*/()xX]/.test(trimmed.replace(/^-/, "")); // Ignore leading minus

  // If no operators, extract first number
  if (!hasOperators) {
    const match = trimmed.match(/-?\d+\.?\d*/);
    return match ? match[0] : "";
  }

  // Clean up the formula:
  // 1. Replace X/x with * (multiplication)
  trimmed = trimmed.replace(/[xX]/g, "*");

  // 2. Remove non-mathematical characters (keep numbers, operators, parentheses, decimal, space)
  trimmed = trimmed.replace(/[^0-9+\-*/().\s]/g, "");

  // 3. Remove trailing operators
  trimmed = trimmed.replace(/[+\-*/]+$/, "");

  // 4. Replace multiple consecutive operators with the last one
  trimmed = trimmed.replace(/([+\-*/])\1+/g, "$1");

  // 5. Clean up operator combinations
  trimmed = trimmed.replace(/[+*/](-)/g, "$1"); // Keep negative sign
  trimmed = trimmed.replace(/([+\-*/])([+*/])/g, "$2"); // Keep last operator

  // 6. Fix unmatched parentheses
  const openCount = (trimmed.match(/\(/g) || []).length;
  const closeCount = (trimmed.match(/\)/g) || []).length;

  if (openCount > closeCount) {
    trimmed += ")".repeat(openCount - closeCount);
  } else if (closeCount > openCount) {
    let extraClose = closeCount - openCount;
    trimmed = trimmed
      .split("")
      .reverse()
      .filter((char) => {
        if (char === ")" && extraClose > 0) {
          extraClose--;
          return false;
        }
        return true;
      })
      .reverse()
      .join("");
  }

  // 7. Remove leading zeros from numbers
  trimmed = trimmed.replace(/\b0+(\d+)/g, "$1");

  return trimmed;
}

/**
 * Safely evaluate a mathematical formula
 */
export function evaluateFormula(input: string): { value: number; error?: string } {
  const trimmed = input.trim();

  // Check if input contains operators (auto-detect formula)
  const hasOperators = /[+\-*/()xX]/.test(trimmed.replace(/^-/, "")); // Ignore leading minus

  // If no operators, extract and parse the first number (strip non-numeric text)
  if (!hasOperators) {
    const match = trimmed.match(/-?\d+\.?\d*/);
    if (match) {
      const parsed = parseFloat(match[0]);
      if (!isNaN(parsed)) {
        return { value: parsed };
      }
    }
    return { value: 0, error: "Invalid number" };
  }

  // Get cleaned formula
  const formula = cleanFormula(input);

  // If after cleanup there's nothing left or just operators/parentheses, return error
  if (!formula || /^[+\-*/().]+$/.test(formula)) {
    return { value: 0, error: "Invalid formula" };
  }

  try {
    // Evaluate the formula safely
    const result = new Function(`'use strict'; return (${formula})`)();

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { value: 0, error: "Formula resulted in invalid number" };
    }

    return { value: result };
  } catch (error) {
    return { value: 0, error: "Invalid formula" };
  }
}
