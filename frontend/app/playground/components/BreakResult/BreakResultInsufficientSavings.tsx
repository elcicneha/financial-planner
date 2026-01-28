import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';

interface Props {
  monthlyExpense: number;
}

export function BreakResultInsufficientSavings({ monthlyExpense }: Props) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="text-center py-8 px-6">
        <AlertTriangle className="size-16 mx-auto mb-3 text-destructive" />
        <span className="block font-display text-2xl md:text-3xl font-bold tracking-tight text-destructive">
          Can't afford this break
        </span>
        <span className="block text-muted-foreground text-sm mt-3">
          You need savings to cover {formatCurrency(monthlyExpense)}/month
        </span>
        <Badge className="mt-4" variant="outline">
          <TrendingUp className="size-4 mr-2" />
          Start by adding current savings or monthly savings amount
        </Badge>
      </CardContent>
    </Card>
  );
}
