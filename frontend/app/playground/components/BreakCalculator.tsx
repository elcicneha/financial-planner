'use client';

import { useRef, useEffect } from 'react';
import { ChevronRight, ArrowRight, Calculator, AlertTriangle, Infinity, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { PlaygroundState } from '@/hooks/usePlaygroundState';
import { Switch } from '@/components/ui/switch';
import { InlineInput } from '@/components/ui/inline-input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface BreakCalculatorProps {
  state: PlaygroundState;
}

export function BreakCalculator({ state }: BreakCalculatorProps) {
  const {
    inputs,
    results,
    bounce,
    assumptionsOpen,
    setAssumptionsOpen,
    updateInput,
    currencySymbol,
    duration,
    edgeCase,
    hasStoredData,
  } = state;

  const firstInputRef = useRef<HTMLInputElement>(null);
  const breakYearsInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus: first input if empty, otherwise break years input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasStoredData) {
        breakYearsInputRef.current?.focus();
      } else {
        firstInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [hasStoredData]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Hero Result - Edge Case Handling */}

      {/* Empty State */}
      {edgeCase.isCompletelyEmpty && (
        <Card className="border-2 border-dashed relative">
          <CardContent className="text-center py-12 px-6">
            <Calculator className="size-12 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="text-lg font-medium mb-2">See How Long Your Money Lasts</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Fill in your details below to calculate how many years your savings will support you during a career break.
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <ArrowRight className="size-4 text-muted-foreground/50 rotate-90" />
              <span className="text-xs text-muted-foreground">Start here</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Expenses - Money Lasts Forever */}
      {edgeCase.noExpenses && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="text-center py-8 px-6">
            <Infinity className="size-16 mx-auto mb-3 text-success" />
            <span className="block font-display text-5xl md:text-6xl font-bold tracking-tight text-success">
              Forever
            </span>
            <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
              Your money lasts
            </span>
            <Badge className="mt-4" variant="outline">
              <AlertTriangle className="size-4 mr-2" />
              Add monthly expenses for realistic projections
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Never Runs Out - 100+ years */}
      {edgeCase.neverRunsOut && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="text-center py-8 px-6">
            <Sparkles className="size-12 mx-auto mb-2 text-success" />
            <span className="block font-display text-6xl md:text-7xl font-bold tracking-tight text-success">
              100+ <span className="text-4xl md:text-5xl font-medium">years</span>
            </span>
            <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
              Effectively forever
            </span>
            <span className="block text-foreground/70 text-base mt-3 font-medium">
              Your money outlasts typical planning horizons
            </span>
          </CardContent>
        </Card>
      )}

      {/* Insufficient Savings - Can't Afford Break */}
      {edgeCase.insufficientSavings && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="text-center py-8 px-6">
            <AlertTriangle className="size-16 mx-auto mb-3 text-destructive" />
            <span className="block font-display text-2xl md:text-3xl font-bold tracking-tight text-destructive">
              Can't afford this break
            </span>
            <span className="block text-muted-foreground text-sm mt-3">
              You need savings to cover {formatCurrency(inputs.monthlyExpense)}/month
            </span>
            <Badge className="mt-4" variant="outline">
              <TrendingUp className="size-4 mr-2" />
              Start by adding current savings or monthly savings amount
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Runs Out Immediately - Less than 1 month */}
      {edgeCase.runsOutImmediately && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="text-center py-8 px-6">
            <AlertTriangle className="size-12 mx-auto mb-3 text-warning" />
            <span className="block font-display text-5xl md:text-6xl font-bold tracking-tight text-warning">
              &lt; 1 <span className="text-3xl md:text-4xl font-medium">month</span>
            </span>
            <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
              Your savings won't cover first month
            </span>
            <span className="block text-foreground/70 text-sm mt-3">
              You'll have {formatCurrency(results.amountAtBreak)} but need {formatCurrency(inputs.monthlyExpense)}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Normal Calculation */}
      {edgeCase.isNormalCalculation && (
        <Card className="border-primary/30 bg-primary-muted">
          <CardContent className="text-center py-8 px-6">
            <span
              className={`block font-display text-6xl md:text-7xl font-bold tracking-tight text-primary-text transition-transform duration-300 ${bounce ? 'scale-105' : ''}`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
              {duration.primary} <span className="text-4xl md:text-5xl font-medium">{duration.unit}</span>
            </span>
            <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
              Your money lasts after break
            </span>
            {inputs.currentAge > 0 && (
              <span className="block text-foreground/70 text-base mt-3 font-medium">
                Until age {Math.ceil(results.corpusRunsOutAge)}
              </span>
            )}
            {results.remainingAmount > 0 && (
              <Badge className="mt-3">
                {formatCurrency(results.remainingAmount)} remaining
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flow Cards - Only show for meaningful calculations */}
      {!edgeCase.isCompletelyEmpty && !edgeCase.insufficientSavings && (
        <div className="flex items-center justify-center gap-3 md:gap-4 my-6">
          <Card className="flex-1 max-w-[180px]">
            <CardContent className="text-center pt-4">
              <div className="text-xs text-muted-foreground mb-1">Today</div>
              <div className="font-semibold text-lg text-primary-text">{formatCurrency(results.currentAmount)}</div>
            </CardContent>
          </Card>
          <ArrowRight className="text-muted-foreground/50 flex-shrink-0 size-5" />
          <Card className="flex-1 max-w-[180px]">
            <CardContent className="text-center pt-4">
              <div className="text-xs text-muted-foreground mb-1">
                At Break{inputs.currentAge > 0 && ` (Age ${results.ageAtBreak})`}
              </div>
              <div className="font-semibold text-lg text-primary-text">{formatCurrency(results.amountAtBreak)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Divider - Only show if flow cards are visible */}
      {!edgeCase.isCompletelyEmpty && !edgeCase.insufficientSavings && (
        <div className="border-t border-border/50 my-6" />
      )}

      {/* Story Inputs */}
      <div className="text-lg md:text-xl leading-relaxed text-foreground/90 space-y-3 py-6 px-2">
        <p className="m-0">
          I&apos;m{' '}
          <InlineInput
            ref={firstInputRef}
            value={inputs.currentAge}
            onChange={updateInput('currentAge')}

          />{' '}
          years old and want to take a break in{' '}
          <InlineInput
            ref={breakYearsInputRef}
            value={inputs.startBreakIn}
            onChange={updateInput('startBreakIn')}
          />{' '}
          years.
        </p>
        <p className="m-0">
          I have{' '}
          <InlineInput
            value={inputs.currentSavings}
            onChange={updateInput('currentSavings')}
            formatAsCurrency
            prefix={currencySymbol}
            arrowKeyOffset="auto"
          />{' '}
          saved and save{' '}
          <InlineInput
            value={inputs.monthlySavings}
            onChange={updateInput('monthlySavings')}
            formatAsCurrency
            prefix={currencySymbol}
            arrowKeyOffset="auto"
          />{' '}
          every month.
        </p>
        <p className="m-0">
          I spend{' '}
          <InlineInput
            value={inputs.monthlyExpense}
            onChange={updateInput('monthlyExpense')}
            formatAsCurrency
            prefix={currencySymbol}
            arrowKeyOffset="auto"
          />
          /month (increasing{' '}
          <InlineInput
            value={inputs.expenseIncreaseRate}
            onChange={updateInput('expenseIncreaseRate')}
            unit="%"
          />{' '}
          yearly).
        </p>
      </div>

      {/* Assumptions */}
      <div className="mt-6">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-sm text-muted-foreground p-2"
          onClick={() => setAssumptionsOpen(!assumptionsOpen)}
        >
          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${assumptionsOpen ? 'rotate-90' : ''}`} />
          <span>Assumptions</span>
          {!assumptionsOpen && (
            <div className="flex flex-wrap gap-2 ml-5">
              <Badge>
                {inputs.returnRateAccumulation}% returns (saving)
              </Badge>
              <Badge>
                {inputs.returnRateSpending}% returns (spending)
              </Badge>
            </div>
          )}
        </Button>

        {assumptionsOpen && (
          <Card className="mt-3 animate-in slide-in-from-top-2 duration-200">
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <Label className="min-w-[140px]">Return rate (saving)</Label>
                <Input
                  type="number"
                  value={inputs.returnRateAccumulation}
                  onChange={(e) =>
                    updateInput('returnRateAccumulation')(parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  max={50}
                  step={0.5}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>

              <div className="flex items-center gap-3">
                <Label className="min-w-[140px]">Return rate (spending)</Label>
                <Input
                  type="number"
                  value={inputs.returnRateSpending}
                  onChange={(e) =>
                    updateInput('returnRateSpending')(parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  max={50}
                  step={0.5}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Use effective rate</Label>
                    <p className="text-xs text-muted-foreground">
                      {inputs.useEffectiveRate
                        ? 'Monthly rate from (1+r)^(1/12)-1'
                        : 'Monthly rate from r/12 (nominal)'}
                    </p>
                  </div>
                  <Switch
                    checked={inputs.useEffectiveRate ?? false}
                    onCheckedChange={updateInput('useEffectiveRate')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Invest at month end</Label>
                  <p className="text-xs text-muted-foreground">
                    {inputs.investAtMonthEnd
                      ? 'Ordinary annuity (payment at period end)'
                      : 'Annuity due (payment at period start)'}
                  </p>
                </div>
                <Switch
                  checked={inputs.investAtMonthEnd ?? false}
                  onCheckedChange={updateInput('investAtMonthEnd')}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
