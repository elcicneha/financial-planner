'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { RetirementInputs, DEFAULT_INPUTS, calculateRetirement } from '@/lib/calculations';
import { getCurrencySymbol } from '@/lib/currency';

export function usePlaygroundState() {
  const [inputs, setInputs] = useState<RetirementInputs>(DEFAULT_INPUTS);
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

  const updateInput = <K extends keyof RetirementInputs>(field: K) => (value: RetirementInputs[K]) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const currencySymbol = getCurrencySymbol();

  const yearsAfterBreak = results.corpusRunsOutAge - results.ageAtBreak;

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
  };
}

export type PlaygroundState = ReturnType<typeof usePlaygroundState>;
