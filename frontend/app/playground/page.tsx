'use client';

import { usePlaygroundState } from '@/hooks/usePlaygroundState';
import { BreakCalculator } from './components/BreakCalculator';

export default function PlaygroundPage() {
  const state = usePlaygroundState();
  return <BreakCalculator state={state} />;
}
