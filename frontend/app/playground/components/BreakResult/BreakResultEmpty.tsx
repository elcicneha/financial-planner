import { Calculator, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function BreakResultEmpty() {
  return (
    <Card className="border-2 border-dashed relative">
      <CardContent className="text-center py-12 px-6">
        <Calculator className="size-12 mx-auto mb-3 text-muted-foreground/40" />
        <h3 className="text-lg font-medium mb-2">See How Long Your Money Lasts</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          Fill in your details below to calculate how many years your savings will support you during a career break.
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <ArrowRight className="size-4 text-muted-foreground/50 rotate-90" />
          <span className="text-xs text-muted-foreground">Start here</span>
        </div>
      </CardContent>
    </Card>
  );
}
