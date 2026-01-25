'use client';

import { useRef, useEffect } from 'react';
import { ChevronRight, ArrowRight, Calculator, AlertTriangle, Infinity, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { PlaygroundState } from '@/hooks/usePlaygroundState';
import { Switch } from '@/components/ui/switch';
import { InlineInput } from '@/components/ui/inline-input';

interface DesignProps {
  state: PlaygroundState;
}

export function DesignCurrent({ state }: DesignProps) {
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
  } = state;

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Hero Result - Edge Case Handling */}

      {/* Empty State */}
      {edgeCase.isCompletelyEmpty && (
        <div className="relative text-center py-12 px-6 rounded-3xl border-2 border-dashed border-muted-foreground/30 bg-muted/20">
          <Calculator className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="text-lg font-medium mb-2">See How Long Your Money Lasts</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Fill in your details below to calculate how many years your savings will support you during a career break.
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 rotate-90" />
            <span className="text-xs text-muted-foreground">Start here</span>
          </div>
        </div>
      )}

      {/* No Expenses - Money Lasts Forever */}
      {edgeCase.noExpenses && (
        <div className="relative text-center py-8 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-green-500/[0.08] to-emerald-500/[0.12] border border-green-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(142,76%,36%,0.1)_0%,transparent_50%)] pointer-events-none" />
          <Infinity className="relative w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
          <span className="relative block font-display text-5xl md:text-6xl font-bold tracking-tight text-green-600 dark:text-green-400">
            Forever
          </span>
          <span className="relative block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
            Your money lasts
          </span>
          <div className="relative inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
            Add monthly expenses for realistic projections
          </div>
        </div>
      )}

      {/* Never Runs Out - 100+ years */}
      {edgeCase.neverRunsOut && (
        <div className="relative text-center py-8 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-green-500/[0.08] to-emerald-500/[0.12] border border-green-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(142,76%,36%,0.1)_0%,transparent_50%)] pointer-events-none" />
          <Sparkles className="relative w-12 h-12 mx-auto mb-2 text-green-600 dark:text-green-400" />
          <span className="relative block font-display text-6xl md:text-7xl font-bold tracking-tight text-green-600 dark:text-green-400">
            100+ <span className="text-4xl md:text-5xl font-medium">years</span>
          </span>
          <span className="relative block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
            Effectively forever
          </span>
          <span className="relative block text-foreground/70 text-base mt-3 font-medium">
            Your money outlasts typical planning horizons
          </span>
        </div>
      )}

      {/* Insufficient Savings - Can't Afford Break */}
      {edgeCase.insufficientSavings && (
        <div className="relative text-center py-8 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-destructive/[0.08] to-red-500/[0.12] border border-destructive/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--destructive)/0.1)_0%,transparent_50%)] pointer-events-none" />
          <AlertTriangle className="relative w-16 h-16 mx-auto mb-3 text-destructive" />
          <span className="relative block font-display text-2xl md:text-3xl font-bold tracking-tight text-destructive">
            Can't afford this break
          </span>
          <span className="relative block text-muted-foreground text-sm mt-3">
            You need savings to cover {formatCurrency(inputs.monthlyExpense)}/month
          </span>
          <div className="relative inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
            <TrendingUp className="w-4 h-4" />
            Start by adding current savings or monthly savings amount
          </div>
        </div>
      )}

      {/* Runs Out Immediately - Less than 1 month */}
      {edgeCase.runsOutImmediately && (
        <div className="relative text-center py-8 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.12] border border-amber-500/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(38,92%,50%,0.1)_0%,transparent_50%)] pointer-events-none" />
          <AlertTriangle className="relative w-12 h-12 mx-auto mb-3 text-amber-600 dark:text-amber-400" />
          <span className="relative block font-display text-5xl md:text-6xl font-bold tracking-tight text-amber-600 dark:text-amber-500">
            &lt; 1 <span className="text-3xl md:text-4xl font-medium">month</span>
          </span>
          <span className="relative block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
            Your savings won't cover first month
          </span>
          <span className="relative block text-foreground/70 text-sm mt-3">
            You'll have {formatCurrency(results.amountAtBreak)} but need {formatCurrency(inputs.monthlyExpense)}
          </span>
        </div>
      )}

      {/* Normal Calculation */}
      {edgeCase.isNormalCalculation && (
        <div className="relative text-center py-8 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/[0.08] to-accent/[0.12]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.08)_0%,transparent_50%)] pointer-events-none" />
          <span
            className={`relative block font-display text-6xl md:text-7xl font-bold tracking-tight text-primary transition-transform duration-300 ${bounce ? 'scale-105' : ''}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {duration.primary} <span className="text-4xl md:text-5xl font-medium">{duration.unit}</span>
          </span>
          <span className="relative block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
            Your money lasts after break
          </span>
          {inputs.currentAge > 0 && (
            <span className="relative block text-foreground/70 text-base mt-3 font-medium">
              Until age {Math.ceil(results.corpusRunsOutAge)}
            </span>
          )}
          {results.remainingAmount > 0 && (
            <span className="relative inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-sm rounded-full bg-muted/60 text-muted-foreground backdrop-blur">
              {formatCurrency(results.remainingAmount)} remaining
            </span>
          )}
        </div>
      )}

      {/* Flow Cards - Only show for meaningful calculations */}
      {!edgeCase.isCompletelyEmpty && !edgeCase.insufficientSavings && (
        <div className="flex items-center justify-center gap-3 md:gap-4 my-6">
          <div className="flex-1 max-w-[180px] p-4 rounded-2xl text-center transition-all duration-200 bg-muted/50 hover:bg-muted/80 hover:-translate-y-0.5">
            <div className="text-xs text-muted-foreground mb-1">Today</div>
            <div className="font-semibold text-lg">{formatCurrency(results.currentAmount)}</div>
          </div>
          <ArrowRight className="text-muted-foreground/50 flex-shrink-0 h-5 w-5" />
          <div className="flex-1 max-w-[180px] p-4 rounded-2xl text-center transition-all duration-200 bg-primary/10 hover:-translate-y-0.5">
            <div className="text-xs text-muted-foreground mb-1">
              At Break{inputs.currentAge > 0 && ` (Age ${results.ageAtBreak})`}
            </div>
            <div className="font-semibold text-lg text-primary">{formatCurrency(results.amountAtBreak)}</div>
          </div>
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
            className={edgeCase.isCompletelyEmpty && inputs.currentAge === 0 ? 'ring-2 ring-primary/30' : ''}
          />{' '}
          years old and want to take a break in{' '}
          <InlineInput
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
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer transition-colors py-2 hover:text-foreground"
          onClick={() => setAssumptionsOpen(!assumptionsOpen)}
        >
          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${assumptionsOpen ? 'rotate-90' : ''}`} />
          <span>Assumptions</span>
          {!assumptionsOpen && (
            <div className="flex flex-wrap gap-2 ml-5">
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {inputs.returnRateAccumulation}% returns (saving)
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {inputs.returnRateSpending}% returns (spending)
              </span>
            </div>
          )}
        </button>

        {assumptionsOpen && (
          <div className="mt-3 p-4 rounded-xl bg-muted/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 text-sm">
              <label className="text-muted-foreground min-w-[140px]">Return rate (saving)</label>
              <input
                type="number"
                value={inputs.returnRateAccumulation}
                onChange={(e) =>
                  updateInput('returnRateAccumulation')(parseFloat(e.target.value) || 0)
                }
                min={0}
                max={50}
                step={0.5}
                className="w-16 px-2 py-1 text-center rounded-lg border border-input bg-background text-sm"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="text-muted-foreground min-w-[140px]">Return rate (spending)</label>
              <input
                type="number"
                value={inputs.returnRateSpending}
                onChange={(e) =>
                  updateInput('returnRateSpending')(parseFloat(e.target.value) || 0)
                }
                min={0}
                max={50}
                step={0.5}
                className="w-16 px-2 py-1 text-center rounded-lg border border-input bg-background text-sm"
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>

            {/* Calculation method options */}
            <div className="border-t border-border/30 pt-3 mt-3">
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Use effective rate</label>
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

            <div className="flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Invest at month end</label>
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
          </div>
        )}
      </div>
    </div>
  );
}
