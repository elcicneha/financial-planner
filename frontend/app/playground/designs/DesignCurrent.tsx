'use client';

import { ChevronRight, ArrowRight } from 'lucide-react';
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
  } = state;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Hero Result */}
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
        <span className="relative block text-foreground/70 text-base mt-3 font-medium">
          Until age {Math.ceil(results.corpusRunsOutAge)}
        </span>
        {results.remainingAmount > 0 && (
          <span className="relative inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-sm rounded-full bg-muted/60 text-muted-foreground backdrop-blur">
            {formatCurrency(results.remainingAmount)} remaining
          </span>
        )}
      </div>

      {/* Flow Cards */}
      <div className="flex items-center justify-center gap-3 md:gap-4 my-6">
        <div className="flex-1 max-w-[180px] p-4 rounded-2xl text-center transition-all duration-200 bg-muted/50 hover:bg-muted/80 hover:-translate-y-0.5">
          <div className="text-xs text-muted-foreground mb-1">Today</div>
          <div className="font-semibold text-lg">{formatCurrency(results.currentAmount)}</div>
        </div>
        <ArrowRight className="text-muted-foreground/50 flex-shrink-0 h-5 w-5" />
        <div className="flex-1 max-w-[180px] p-4 rounded-2xl text-center transition-all duration-200 bg-primary/10 hover:-translate-y-0.5">
          <div className="text-xs text-muted-foreground mb-1">At Break (Age {results.ageAtBreak})</div>
          <div className="font-semibold text-lg text-primary">{formatCurrency(results.amountAtBreak)}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 my-6" />

      {/* Story Inputs */}
      <div className="text-lg md:text-xl leading-relaxed text-foreground/90 space-y-3 py-6 px-2">
        <p className="m-0">
          I&apos;m{' '}
          <InlineInput
            value={inputs.currentAge}
            onChange={updateInput('currentAge')}
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
