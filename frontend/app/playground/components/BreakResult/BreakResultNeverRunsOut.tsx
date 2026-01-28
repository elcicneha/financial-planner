import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function BreakResultNeverRunsOut() {
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="text-center py-8 px-6">
        <Sparkles className="size-12 mx-auto mb-2 text-success" />
        <span className="block font-display text-6xl md:text-7xl font-bold tracking-tight text-success">
          100+ <span className="text-4xl md:text-5xl font-medium">years</span>
        </span>
        <span className="block text-muted-foreground text-sm mt-2 uppercase tracking-widest">
          Effectively forever
        </span>
        <span className="block text-foreground/70 text-base mt-3 font-medium">
          Your money outlasts typical planning horizons
        </span>
      </CardContent>
    </Card>
  );
}
