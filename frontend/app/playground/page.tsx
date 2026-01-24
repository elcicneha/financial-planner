'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Calculator, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';
import { RetirementInputs, DEFAULT_INPUTS, calculateRetirement } from '@/lib/calculations';

export default function PlaygroundPage() {
  const [inputs, setInputs] = useState<RetirementInputs>(DEFAULT_INPUTS);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // Display values for currency inputs
  const [savingsDisplay, setSavingsDisplay] = useState(
    formatCurrency(inputs.currentSavings, undefined, false)
  );
  const [monthlySavingsDisplay, setMonthlySavingsDisplay] = useState(
    formatCurrency(inputs.monthlySavings, undefined, false)
  );
  const [monthlyExpenseDisplay, setMonthlyExpenseDisplay] = useState(
    formatCurrency(inputs.monthlyExpense, undefined, false)
  );

  // Calculate results
  const results = useMemo(() => calculateRetirement(inputs), [inputs]);

  const handleNumberChange = (field: keyof RetirementInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (
    field: keyof RetirementInputs,
    setDisplay: React.Dispatch<React.SetStateAction<string>>
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numericValue = parseInt(rawValue) || 0;
    setInputs((prev) => ({ ...prev, [field]: numericValue }));
    setDisplay(formatCurrency(numericValue, undefined, false));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Planning Playground
            </h1>
            <p className="text-muted-foreground mt-1">
              Tools for analyzing and planning your investments
            </p>
          </div>
        </div>
      </div>

      {/* Retirement Calculator */}
      <Card className="card-interactive">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Calculator className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Calculator</span>
          </div>
          <CardTitle className="font-display text-2xl">
            Retirement Planner
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Plan your path to financial independence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Basic Info
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Current Age */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Current Age
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={inputs.currentAge || ''}
                    onChange={handleNumberChange('currentAge')}
                    min={0}
                    max={100}
                    placeholder="e.g. 26"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    years
                  </span>
                </div>
              </div>

              {/* Start Break In */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Start break in
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={inputs.startBreakIn || ''}
                    onChange={handleNumberChange('startBreakIn')}
                    min={0}
                    placeholder="e.g. 4"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    years
                  </span>
                </div>
              </div>

              {/* Current Savings */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Current Savings
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    type="text"
                    value={savingsDisplay}
                    onChange={handleCurrencyChange('currentSavings', setSavingsDisplay)}
                    placeholder="e.g. 2,50,000"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Figures */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Monthly Figures
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Monthly Savings */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Monthly Savings
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    type="text"
                    value={monthlySavingsDisplay}
                    onChange={handleCurrencyChange('monthlySavings', setMonthlySavingsDisplay)}
                    placeholder="e.g. 50,000"
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Monthly Expense */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Monthly Expense
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {getCurrencySymbol()}
                  </span>
                  <Input
                    type="text"
                    value={monthlyExpenseDisplay}
                    onChange={handleCurrencyChange('monthlyExpense', setMonthlyExpenseDisplay)}
                    placeholder="e.g. 40,000"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assumptions (Collapsible) */}
          <div className="space-y-3">
            <button
              onClick={() => setAssumptionsOpen(!assumptionsOpen)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {assumptionsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Assumptions
              <span className="text-xs font-normal normal-case">
                (click to {assumptionsOpen ? 'hide' : 'edit'})
              </span>
            </button>

            {assumptionsOpen && (
              <div className="grid gap-4 md:grid-cols-3 pt-2">
                {/* Return Rate Accumulation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Return rate (saving)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={inputs.returnRateAccumulation || ''}
                      onChange={handleNumberChange('returnRateAccumulation')}
                      min={0}
                      max={50}
                      step={0.5}
                      placeholder="e.g. 12"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                {/* Return Rate Spending */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Return rate (spending)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={inputs.returnRateSpending || ''}
                      onChange={handleNumberChange('returnRateSpending')}
                      min={0}
                      max={50}
                      step={0.5}
                      placeholder="e.g. 8"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                {/* Expense Increase Rate */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Expense increase
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={inputs.expenseIncreaseRate || ''}
                      onChange={handleNumberChange('expenseIncreaseRate')}
                      min={0}
                      max={30}
                      step={0.5}
                      placeholder="e.g. 5"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Projection
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Current Amount */}
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">Today</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(results.currentAmount)}
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Amount at Break */}
              <div className="p-4 rounded-xl bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  At Break (Age {results.ageAtBreak})
                </p>
                <p className="text-xl font-semibold text-primary">
                  {formatCurrency(results.amountAtBreak)}
                </p>
              </div>
            </div>

            {/* Corpus Runs Out */}
            <div className="mt-4 p-4 rounded-xl border border-border text-center">
              <p className="text-sm text-muted-foreground mb-1">Corpus runs out at</p>
              <p className="text-2xl font-bold">
                Age {results.corpusRunsOutAge}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
