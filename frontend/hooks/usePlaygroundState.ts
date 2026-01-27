'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { RetirementInputs, EMPTY_INPUTS, calculateRetirement } from '@/lib/calculations';
import { getCurrencySymbol } from '@/lib/currency';

const STORAGE_KEY_INPUTS = 'playground-inputs';

export function usePlaygroundState() {
  const [mounted, setMounted] = useState(false);
  const [inputs, setInputs] = useState<RetirementInputs>(EMPTY_INPUTS);
  const [hasStoredData, setHasStoredData] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [bounce, setBounce] = useState(false);

  const results = useMemo(() => calculateRetirement(inputs), [inputs]);

  const prevAge = useRef(results.corpusRunsOutAge);
  useEffect(() => {
    if (prevAge.current !== results.corpusRunsOutAge) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 300);
      prevAge.current = results.corpusRunsOutAge;
      return () => clearTimeout(timer);
    }
  }, [results.corpusRunsOutAge]);

  // Load from localStorage on mount (only once)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INPUTS);
      // Load stored values if available, merge with EMPTY_INPUTS for missing fields
      if (stored) {
        const parsed = JSON.parse(stored);
        setInputs({ ...EMPTY_INPUTS, ...parsed });
        setHasStoredData(true);
      }
      // If nothing stored, keep EMPTY_INPUTS (already set as initial state)
    } catch (error) {
      console.warn('Failed to load saved inputs:', error);
      // Keep EMPTY_INPUTS on error
    }

    setMounted(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(inputs));
    } catch (error) {
      console.warn('Failed to save inputs:', error);
    }
  }, [inputs, mounted]);

  const updateInput = <K extends keyof RetirementInputs>(field: K) => (value: RetirementInputs[K]) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const currencySymbol = getCurrencySymbol();

  const yearsAfterBreak = results.corpusRunsOutAge - results.ageAtBreak;

  // Edge case detection
  const hasExpenses = inputs.monthlyExpense > 0;
  const hasSavings = inputs.currentSavings > 0 || inputs.monthlySavings > 0;

  const isCompletelyEmpty = !hasExpenses && !hasSavings;
  const neverRunsOut = hasExpenses && hasSavings && yearsAfterBreak >= 100;
  const noExpenses = !hasExpenses && hasSavings;
  const insufficientSavings = hasExpenses && !hasSavings;
  const runsOutImmediately = hasExpenses && hasSavings && yearsAfterBreak < (1/12); // Less than 1 month
  const isNormalCalculation = hasExpenses && hasSavings && yearsAfterBreak >= (1/12) && yearsAfterBreak < 100;

  const formatDuration = (years: number) => {
    const fullYears = Math.floor(years);
    const remainingMonths = Math.round((years - fullYears) * 12);

    if (fullYears === 0) {
      return { primary: `${remainingMonths}`, unit: remainingMonths === 1 ? 'month' : 'months' };
    }
    if (remainingMonths === 0) {
      return { primary: `${fullYears}`, unit: fullYears === 1 ? 'year' : 'years' };
    }
    return { primary: `${fullYears}y ${remainingMonths}m`, unit: '' };
  };

  const duration = formatDuration(yearsAfterBreak);

  return {
    inputs,
    setInputs,
    results,
    bounce,
    assumptionsOpen,
    setAssumptionsOpen,
    updateInput,
    currencySymbol,
    yearsAfterBreak,
    duration,
    hasStoredData,
    // Edge case states
    edgeCase: {
      isCompletelyEmpty,
      neverRunsOut,
      noExpenses,
      insufficientSavings,
      runsOutImmediately,
      isNormalCalculation,
    },
  };
}

export type PlaygroundState = ReturnType<typeof usePlaygroundState>;
