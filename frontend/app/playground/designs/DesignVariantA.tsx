'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/currency';
import { RetirementInputs } from '@/lib/calculations';
import { PlaygroundState } from '@/hooks/usePlaygroundState';

// Inline editable input component
function InlineInput({
  value,
  onChange,
  unit,
  prefix,
  formatAsCurrency = false,
}: {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  prefix?: string;
  formatAsCurrency?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(String(value));
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(String(value));
  };

  const handleBlur = () => {
    setIsEditing(false);
    const cleanValue = localValue.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(cleanValue) || 0;
    onChange(numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const displayValue = formatAsCurrency ? formatNumber(value) : String(value);
  const currentValue = isEditing ? localValue : displayValue;
  const width = Math.max(currentValue.length, 2) + 1;

  return (
    <span className="inline-flex items-center relative">
      {prefix && <span className="text-muted-foreground mr-0.5">{prefix}</span>}
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{ width: `${width}ch` }}
        inputMode="numeric"
        className="bg-transparent border-0 p-0 m-0 font-semibold text-foreground text-center rounded transition-all duration-150 focus:outline-none focus:ring-0 focus:bg-primary/10 focus:shadow-[0_2px_0_hsl(var(--primary))] shadow-[0_2px_0_hsl(var(--primary)/0.3)] cursor-pointer hover:bg-primary/5 hover:shadow-[0_2px_0_hsl(var(--primary)/0.5)]"
      />
      {unit && <span className="text-muted-foreground ml-0.5 text-[0.85em]">{unit}</span>}
    </span>
  );
}

interface DesignProps {
  state: PlaygroundState;
}

export function DesignVariantA({ state }: DesignProps) {
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
          />{' '}
          saved and save{' '}
          <InlineInput
            value={inputs.monthlySavings}
            onChange={updateInput('monthlySavings')}
            formatAsCurrency
            prefix={currencySymbol}
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
          </div>
        )}
      </div>
    </div>
  );
}
