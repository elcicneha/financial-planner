'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { UploadDialog } from '@/components/UploadDialog';
import DataDisplay from '@/components/DataDisplay';

export default function UploadPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasData, setHasData] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <FileText className="size-6" />
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
          <UploadDialog
            endpoint="/api/upload"
            accept=".pdf"
            multiple={false}
            onSuccess={handleUploadSuccess}
          >
            <UploadDialog.TriggerButton>Upload New PDF</UploadDialog.TriggerButton>
            <UploadDialog.Content>
              <UploadDialog.Header>
                <UploadDialog.Title>Upload Statement</UploadDialog.Title>
                <UploadDialog.Description>
                  Upload a mutual fund PDF statement to extract transactions
                </UploadDialog.Description>
              </UploadDialog.Header>
              <UploadDialog.Body placeholder="Drag and drop your PDF here" />
              <UploadDialog.Footer />
            </UploadDialog.Content>
          </UploadDialog>
        )}
      </div>

      <DataDisplay
        refreshKey={refreshKey}
        onDataStateChange={setHasData}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
