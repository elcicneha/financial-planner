'use client';

import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import FileUpload from '@/components/FileUpload';
import DataDisplay from '@/components/DataDisplay';

export default function UploadPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasData, setHasData] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    setIsUploadOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              My Transactions
            </h1>
            <p className="text-muted-foreground mt-1">
              View your mutual fund transactions
            </p>
          </div>
        </div>
        {hasData && (
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload New PDF
          </Button>
        )}
      </div>

      <DataDisplay
        refreshKey={refreshKey}
        onDataStateChange={setHasData}
        onUploadSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Statement</DialogTitle>
            <DialogDescription>
              Upload a mutual fund PDF statement to extract transactions
            </DialogDescription>
          </DialogHeader>
          <FileUpload onSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
