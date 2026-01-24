'use client';

import { useState, useEffect } from 'react';
import { usePlaygroundState } from '@/hooks/usePlaygroundState';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { designs, defaultDesign, designKeys } from './designs';
import { DesignSwitcher } from './components/DesignSwitcher';

const STORAGE_KEY = 'playground-design';

export default function PlaygroundPage() {
  const state = usePlaygroundState();
  const { isDevMode } = useDevMode();
  const [selectedDesign, setSelectedDesign] = useState(defaultDesign);
  const [mounted, setMounted] = useState(false);

  // Load saved design from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && designKeys.includes(stored)) {
      setSelectedDesign(stored);
    }
    setMounted(true);
  }, []);

  // Save design selection to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, selectedDesign);
    }
  }, [selectedDesign, mounted]);

  const SelectedComponent = designs[selectedDesign]?.component ?? designs[defaultDesign].component;

  return (
    <>
      <DesignSwitcher selected={selectedDesign} onChange={setSelectedDesign} />
      <div className={isDevMode ? 'pt-12' : ''}>
        <SelectedComponent state={state} />
      </div>
    </>
  );
}
