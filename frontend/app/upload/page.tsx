'use client';

import { Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      <div className="flex items-center gap-3">
        <div className="icon-container">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Upload Statement
          </h1>
          <p className="text-muted-foreground mt-1">
            Extract transactions from your mutual fund PDF
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
