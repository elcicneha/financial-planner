'use client';

import { useState, useEffect } from 'react';
import { usePlaygroundState } from '@/hooks/usePlaygroundState';
import { useDevMode } from '@/components/dev/DevModeProvider';
import { designs, defaultDesign, designKeys } from './designs';
import { VariantSwitcher } from '@/components/VariantSwitcher';

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

  // Keyboard shortcuts (1, 2, 3, etc.) - only in dev mode
  useEffect(() => {
    if (!isDevMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= designKeys.length) {
        setSelectedDesign(designKeys[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDevMode]);

  const SelectedComponent = designs[selectedDesign]?.component ?? designs[defaultDesign].component;

  return (
    <>
      <VariantSwitcher selected={selectedDesign} onChange={setSelectedDesign} variants={designs} />
      <div className={isDevMode ? 'pt-12' : ''}>
        <SelectedComponent state={state} />
      </div>
    </>
  );
}
