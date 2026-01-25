export interface RetirementInputs {
  // Basic Info
  currentAge: number;
  startBreakIn: number;
  currentSavings: number;

  // Monthly figures
  monthlySavings: number;
  monthlyExpense: number;

  // Assumptions
  returnRateAccumulation: number; // annual % (e.g., 12)
  returnRateSpending: number;     // annual % (e.g., 8)
  expenseIncreaseRate: number;    // annual % (e.g., 5)

  // Calculation method options
  useEffectiveRate?: boolean;    // Default: false (nominal)
  investAtMonthEnd?: boolean;    // Default: false (month start)
}

export interface CalculationResult {
  currentAmount: number;
  amountAtBreak: number;
  ageAtBreak: number;
  corpusRunsOutAge: number;
  remainingAmount: number; // Amount left when you can't cover a full month
}

export const DEFAULT_INPUTS: RetirementInputs = {
  currentAge: 26,
  startBreakIn: 4,
  currentSavings: 250000,
  monthlySavings: 50000,
  monthlyExpense: 40000,
  returnRateAccumulation: 12,
  returnRateSpending: 8,
  expenseIncreaseRate: 5,
  useEffectiveRate: true,
  investAtMonthEnd: false,
};

/**
 * Convert annual rate to monthly rate using effective or nominal method
 */
function getMonthlyRate(annualRate: number, useEffective: boolean): number {
  if (useEffective) {
    // Effective: (1 + r)^(1/12) - 1
    return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  } else {
    // Nominal: r / 12
    return annualRate / 100 / 12;
  }
}

/**
 * Calculate retirement projections
 *
 * Phase 1 (Accumulation): Grow savings with monthly contributions until break
 * Phase 2 (Spending): Withdraw monthly expenses (increasing yearly) until corpus depletes
 */
export function calculateRetirement(inputs: RetirementInputs): CalculationResult {
  const {
    currentAge,
    startBreakIn,
    currentSavings,
    monthlySavings,
    monthlyExpense,
    returnRateAccumulation,
    returnRateSpending,
    expenseIncreaseRate,
    useEffectiveRate,
    investAtMonthEnd,
  } = inputs;

  // Phase 1: Accumulation
  const monthsUntilBreak = startBreakIn * 12;
  const monthlyRateAccum = getMonthlyRate(returnRateAccumulation, useEffectiveRate ?? false);

  let amountAtBreak: number;
  if (monthsUntilBreak === 0) {
    // Break starts immediately - no accumulation phase
    amountAtBreak = currentSavings;
  } else if (monthlyRateAccum === 0) {
    // No growth case
    amountAtBreak = currentSavings + monthlySavings * monthsUntilBreak;
  } else {
    // Future value of lump sum + future value of annuity
    const fvLumpSum = currentSavings * Math.pow(1 + monthlyRateAccum, monthsUntilBreak);

    // Calculate annuity based on timing
    let fvAnnuity: number;
    if (investAtMonthEnd ?? false) {
      // Ordinary annuity (payment at end of period)
      fvAnnuity = monthlySavings * ((Math.pow(1 + monthlyRateAccum, monthsUntilBreak) - 1) / monthlyRateAccum);
    } else {
      // Annuity due (payment at beginning of period)
      fvAnnuity = monthlySavings * ((Math.pow(1 + monthlyRateAccum, monthsUntilBreak) - 1) / monthlyRateAccum) * (1 + monthlyRateAccum);
    }

    amountAtBreak = fvLumpSum + fvAnnuity;
  }

  const ageAtBreak = currentAge + startBreakIn;

  // Phase 2: Spending
  const monthlyRateSpend = getMonthlyRate(returnRateSpending, useEffectiveRate ?? false);
  const yearlyExpenseMultiplier = 1 + expenseIncreaseRate / 100;

  let corpus = amountAtBreak;
  let currentExpense = monthlyExpense;
  let monthsInSpending = 0;
  const maxMonths = 100 * 12; // Cap at 100 years of spending to prevent infinite loop

  // Stop when corpus can't cover a full month's expense
  while (corpus >= currentExpense && monthsInSpending < maxMonths) {
    // Apply monthly growth
    corpus = corpus * (1 + monthlyRateSpend);

    // Withdraw monthly expense
    corpus = corpus - currentExpense;

    monthsInSpending++;

    // Increase expense at the start of each new year
    if (monthsInSpending > 0 && monthsInSpending % 12 === 0) {
      currentExpense = currentExpense * yearlyExpenseMultiplier;
    }
  }

  const yearsInSpending = monthsInSpending / 12;
  const corpusRunsOutAge = ageAtBreak + yearsInSpending;
  const remainingAmount = Math.max(0, Math.round(corpus));

  return {
    currentAmount: currentSavings,
    amountAtBreak: Math.round(amountAtBreak),
    ageAtBreak,
    corpusRunsOutAge: Math.round(corpusRunsOutAge * 10) / 10, // Round to 1 decimal
    remainingAmount,
  };
}
