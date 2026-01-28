import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';

interface Props {
  amountAtBreak: number;
  monthlyExpense: number;
}

export function BreakResultRunsOutImmediately({ amountAtBreak, monthlyExpense }: Props) {
  return (
    <Card className="border-warning/30 bg-warning-muted">
      <CardContent className="text-center py-8 px-6">
        <AlertTriangle className="size-12 mx-auto mb-3 text-warning-text" />
        <span className="block font-display text-5xl md:text-6xl font-bold tracking-tight text-warning-text">
          &lt; 1 <span className="text-3xl md:text-4xl font-medium">month</span>
        </span>
        <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
          Your savings won't cover first month
        </span>
        <span className="block text-foreground/70 text-sm mt-3">
          You'll have {formatCurrency(amountAtBreak)} but need {formatCurrency(monthlyExpense)}
        </span>
      </CardContent>
    </Card>
  );
}
