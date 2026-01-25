'use client';

import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export interface TimelineMilestone {
  age: number;
  icon: string | React.ReactNode;
  label: string;
  sublabel?: string;
  variant?: 'default' | 'primary' | 'warning';
}

export interface TimelineProps {
  milestones: TimelineMilestone[];
  className?: string;
  minSpacing?: number;
}

const variantStyles = {
  default: {
    node: 'bg-gradient-to-br from-white to-secondary/30 border-2 border-secondary/60 dark:from-muted dark:to-secondary/20',
    glow: 'bg-secondary/30',
    text: 'text-secondary-foreground',
  },
  primary: {
    node: 'bg-gradient-to-br from-white to-primary/20 border-2 border-primary dark:from-muted dark:to-primary/30',
    glow: 'bg-primary/30',
    text: 'text-primary',
  },
  warning: {
    node: 'bg-gradient-to-br from-white to-warning-muted border-2 border-warning dark:from-muted dark:to-warning/30',
    glow: 'bg-warning/30',
    text: 'text-warning',
  },
};

const phaseLabels = ['Saving', 'Spending'];

function calculateHybridPositions(ages: number[], minSpacing: number): number[] {
  if (ages.length === 0) return [];
  if (ages.length === 1) return [50];

  const totalSpan = ages[ages.length - 1] - ages[0];
  if (totalSpan === 0) return ages.map(() => 50);

  let positions = ages.map(age => ((age - ages[0]) / totalSpan) * 100);

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] < minSpacing) {
      const adjustment = minSpacing - (positions[i] - positions[i - 1]);
      for (let j = i; j < positions.length; j++) {
        positions[j] += adjustment;
      }
    }
  }

  const max = positions[positions.length - 1];
  return positions.map(p => (p / max) * 100);
}

export function Timeline({
  milestones,
  className,
  minSpacing = 30,
}: TimelineProps) {
  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) => a.age - b.age),
    [milestones]
  );

  const positions = useMemo(
    () => calculateHybridPositions(sortedMilestones.map(m => m.age), minSpacing),
    [sortedMilestones, minSpacing]
  );

  if (sortedMilestones.length === 0) return null;

  return (
    <div
      className={cn('relative w-full py-6 px-8', className)}
      role="group"
      aria-label="Financial timeline"
    >
      {/* Screen reader content */}
      <div className="sr-only">
        <ul>
          {sortedMilestones.map(m => (
            <li key={m.age}>
              Age {Math.round(m.age)}: {m.label}
              {m.sublabel ? ` - ${m.sublabel}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {/* Visual timeline */}
      <div aria-hidden="true" className="relative h-36">
        {/* Connecting line */}
        <div
          className="absolute top-[52px] h-[2px] bg-border rounded-full"
          style={{
            left: `${positions[0]}%`,
            right: `${100 - positions[positions.length - 1]}%`,
          }}
        />

        {/* Phase labels between milestones */}
        {positions.slice(0, -1).map((pos, i) => {
          const midpoint = pos + (positions[i + 1] - pos) / 2;
          return (
            <div
              key={`phase-${i}`}
              className="absolute top-[62px] -translate-x-1/2 animate-in fade-in duration-500"
              style={{
                left: `${midpoint}%`,
                animationDelay: `${300 + i * 100}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-medium">
                {phaseLabels[i] || ''}
              </span>
            </div>
          );
        })}

        {/* Milestones */}
        {sortedMilestones.map((milestone, index) => {
          const variant = milestone.variant || 'default';
          const styles = variantStyles[variant];

          return (
            <div
              key={milestone.age}
              className="absolute flex flex-col items-center -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{
                left: `${positions[index]}%`,
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'backwards',
              }}
            >
              {/* Age label - Hero typography */}
              <span
                className={cn(
                  "text-2xl font-semibold mb-2 tracking-tight",
                  styles.text
                )}
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {Math.round(milestone.age)}
              </span>

              {/* Milestone node with glow */}
              <div className="relative group">
                {/* Outer glow - visible on hover */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    styles.glow
                  )}
                />
                {/* Ambient glow - always visible, subtle */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full blur-md scale-125 opacity-40",
                    styles.glow
                  )}
                />
                {/* Main node */}
                <div
                  className={cn(
                    'relative w-12 h-12 rounded-full flex items-center justify-center text-xl z-10',
                    'shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]',
                    'transition-transform duration-200 group-hover:scale-110',
                    styles.node
                  )}
                >
                  <span className="drop-shadow-sm">{milestone.icon}</span>
                </div>
              </div>

              {/* Labels */}
              <div className="flex flex-col items-center mt-3">
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {milestone.label}
                </span>
                {milestone.sublabel && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                    {milestone.sublabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
