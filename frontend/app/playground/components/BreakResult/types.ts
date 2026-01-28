export interface BreakResultProps {
  inputs: {
    monthlyExpense: number;
    currentAge: number;
  };
  results: {
    currentAmount: number;
    amountAtBreak: number;
    corpusRunsOutAge: number;
    remainingAmount: number;
    ageAtBreak: number;
  };
  duration: {
    primary: string;
    unit: string;
  };
  bounce?: boolean;
}
