import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';

interface Props {
  duration: {
    primary: string;
    unit: string;
  };
  bounce: boolean;
  currentAge: number;
  corpusRunsOutAge: number;
  remainingAmount: number;
}

export function BreakResultNormal({ duration, bounce, currentAge, corpusRunsOutAge, remainingAmount }: Props) {
  return (
    <Card className="border-primary/30 bg-primary-muted">
      <CardContent className="text-center py-8 px-6">
        <span
          className={`block font-display text-6xl md:text-7xl font-bold tracking-tight text-primary-text transition-transform duration-300 ${bounce ? 'scale-105' : ''}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          {duration.primary} <span className="text-4xl md:text-5xl font-medium">{duration.unit}</span>
        </span>
        <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
          Your money lasts after break
        </span>
        {currentAge > 0 && (
          <span className="block text-foreground/70 text-base mt-3 font-medium">
            Until age {Math.ceil(corpusRunsOutAge)}
          </span>
        )}
        {remainingAmount > 0 && (
          <Badge className="mt-3">
            {formatCurrency(remainingAmount)} remaining
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
