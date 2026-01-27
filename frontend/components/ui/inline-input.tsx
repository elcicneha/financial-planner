'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { formatNumber } from '@/lib/currency';
import { cn } from '@/lib/utils';

// Helper function: Calculate offset based on value magnitude
function calculateOffset(value: number, offsetConfig: number | 'auto'): number {
  if (typeof offsetConfig === 'number') return offsetConfig;

  const absValue = Math.abs(value);
  if (absValue < 10) return 1;

  const digitCount = Math.floor(Math.log10(absValue)) + 1;
  const offsetMap: Record<number, number> = {
    1: 1,
    2: 1,
    3: 1,
    4: 500,
    5: 1000,
    6: 10000,
  };
  return offsetMap[digitCount] || Math.pow(10, digitCount - 2);
}

// Helper function: Auto-detect selection behavior
function shouldSelectOnClick(value: number, selectOnClick?: boolean): boolean {
  if (selectOnClick !== undefined) return selectOnClick;
  return Math.abs(value) < 1000;
}

// Helper function: Constrain value to min/max bounds
function constrainValue(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}

// Helper function: Clean and validate input
function cleanValue(
  rawValue: string,
  allowDecimals: boolean,
  allowNegative: boolean
): number {
  let pattern = allowDecimals ? /[^0-9.-]/g : /[^0-9-]/g;
  if (!allowNegative) {
    pattern = allowDecimals ? /[^0-9.]/g : /[^0-9]/g;
  }
  const cleaned = rawValue.replace(pattern, '');
  return parseFloat(cleaned) || 0;
}

export interface InlineInputProps {
  // Core
  value: number;
  onChange: (value: number) => void;

  // Display formatting
  unit?: string;
  prefix?: string;
  formatAsCurrency?: boolean;

  // Arrow key behavior
  arrowKeyOffset?: number | 'auto';
  enableArrowKeys?: boolean;

  // Selection behavior
  selectOnClick?: boolean;
  selectOnFocus?: boolean;

  // Validation
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  allowNegative?: boolean;

  // Styling
  className?: string;

  // Callbacks
  onBlur?: (value: number) => void;
  onFocus?: () => void;
}

export const InlineInput = React.forwardRef<HTMLInputElement, InlineInputProps>(
  (
    {
      value,
      onChange,
      arrowKeyOffset = 1,
      enableArrowKeys = true,
      selectOnClick,
      selectOnFocus = false,
      formatAsCurrency = false,
      allowDecimals = true,
      allowNegative = false,
      className,
      unit,
      prefix,
      min,
      max,
      onBlur: onBlurCallback,
      onFocus: onFocusCallback,
    },
    ref
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    // Forward ref
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Sync external value changes
    useEffect(() => {
      if (!isEditing) {
        setLocalValue(String(value));
      }
    }, [value, isEditing]);

    const handleFocus = () => {
      setIsEditing(true);
      setLocalValue(String(value));

      if (selectOnFocus || shouldSelectOnClick(value, selectOnClick)) {
        setTimeout(() => inputRef.current?.select(), 0);
      }

      onFocusCallback?.();
    };

    const handleBlur = () => {
      setIsEditing(false);
      const numValue = cleanValue(localValue, allowDecimals, allowNegative);
      const constrainedValue = constrainValue(numValue, min, max);
      onChange(constrainedValue);
      onBlurCallback?.(constrainedValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Arrow key increment/decrement
      if (enableArrowKeys && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const offset = calculateOffset(value, arrowKeyOffset);
        const delta = e.key === 'ArrowUp' ? offset : -offset;
        let newValue = value + delta;

        if (!allowDecimals) {
          newValue = Math.round(newValue);
        }

        newValue = constrainValue(newValue, min, max);

        onChange(newValue);
        setLocalValue(String(newValue));
      }

      // Enter key to submit
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        setLocalValue(String(value));
        inputRef.current?.blur();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (!isEditing && shouldSelectOnClick(value, selectOnClick)) {
        setTimeout(() => inputRef.current?.select(), 0);
      }
    };

    // Display formatting
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
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          style={{ width: `${width}ch` }}
          inputMode="numeric"
          className={cn(
            'bg-transparent border-0 border-primary/50 border-b-2 p-0 m-0 font-semibold text-foreground text-center rounded transition-all duration-150',
            'focus-ring',
            'cursor-pointer',
            'hover:bg-primary/5',
            className
          )}
        />
        {unit && <span className="text-muted-foreground ml-0.5 text-[0.85em]">{unit}</span>}
      </span>
    );
  }
);

InlineInput.displayName = 'InlineInput';
