import { Infinity, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function BreakResultNoExpenses() {
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="text-center py-8 px-6">
        <Infinity className="size-16 mx-auto mb-3 text-success" />
        <span className="block font-display text-5xl md:text-6xl font-bold tracking-tight text-success">
          Forever
        </span>
        <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
          Your money lasts
        </span>
        <Badge className="mt-4" variant="outline">
          <AlertTriangle className="size-4 mr-2" />
          Add monthly expenses for realistic projections
        </Badge>
      </CardContent>
    </Card>
  );
}
