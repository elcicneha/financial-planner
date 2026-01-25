'use client';

import { useState, useEffect } from 'react';
import { VariantSwitcher } from '@/components/VariantSwitcher';
import { variants, defaultVariant, variantKeys } from './variants';
import { useDevMode } from '@/components/dev/DevModeProvider';

const STORAGE_KEY = 'itr-prep-variant';

export default function ITRPrepPage() {
  const { isDevMode } = useDevMode();
  const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
  const [mounted, setMounted] = useState(false);

  // Load saved variant from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && variantKeys.includes(stored)) {
      setSelectedVariant(stored);
    }
    setMounted(true);
  }, []);

  // Save variant selection to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, selectedVariant);
    }
  }, [selectedVariant, mounted]);

  // Get selected variant component
  const SelectedComponent = variants[selectedVariant]?.component ?? variants[defaultVariant].component;

  return (
    <>
      <VariantSwitcher selected={selectedVariant} onChange={setSelectedVariant} variants={variants} />
      <div className={isDevMode ? 'pt-12' : ''}>
        <SelectedComponent />
      </div>
    </>
  );
}
