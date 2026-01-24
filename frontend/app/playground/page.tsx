import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, PieChart, Calculator, Zap } from 'lucide-react';

const upcomingFeatures = [
  {
    icon: PieChart,
    title: 'Portfolio Allocation',
    description: 'Visualize your fund distribution across categories',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: TrendingUp,
    title: 'Performance Tracking',
    description: 'Track your investment growth over time',
    color: 'bg-success-muted text-success',
  },
  {
    icon: Calculator,
    title: 'Goal Planning',
    description: 'Set and track your financial goals',
    color: 'bg-accent text-accent-foreground',
  },
];

export default function PlaygroundPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Planning Playground
            </h1>
            <p className="text-muted-foreground mt-1">
              Tools for analyzing and planning your investments
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Hero */}
      <Card className="card-interactive">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Zap className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Coming Soon</span>
          </div>
          <CardTitle className="font-display text-2xl">
            Your Financial Command Center
          </CardTitle>
          <CardDescription className="text-base mt-2">
            We&apos;re building powerful tools to help you understand your investments,
            track performance, and plan for the future. Stay tuned!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all duration-200 page-enter"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`inline-flex p-3 rounded-xl ${feature.color} mb-3 group-hover:scale-105 transition-transform`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status indicator */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Features in development</span>
        </div>
      </div>
    </div>
  );
}
