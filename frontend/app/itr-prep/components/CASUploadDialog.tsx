'use client';

import { useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { UploadDialog } from '@/components/UploadDialog';

interface CASUploadDialogProps {
  onUploadSuccess?: (financialYears: string[]) => void;
}

// Collapsible instructions component
function CASInstructions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 py-1.5 -ml-0.5"
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-300 ease-out ${isOpen ? 'rotate-90' : ''}`}
        />
        <span>How to get your Capital Gains Statement</span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`pl-5 pr-3 py-3 rounded-lg bg-muted/30 transition-colors duration-300 ${
              isOpen ? 'border-l-primary/50' : 'border-l-transparent'
            }`}
          >
            <div className="space-y-4">
              {/* CAMS Instructions */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">CAMS:</p>
                <ol className="space-y-1 text-[13px] leading-snug text-muted-foreground">
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">1.</span>
                    <span>Open CAMS link → Enter email & PAN</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">2.</span>
                    <span>Select financial year & mutual funds</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">3.</span>
                    <span>File format → Select "Excel"</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">4.</span>
                    <span>Download .xls file and upload below</span>
                  </li>
                </ol>
              </div>

              {/* KFINTECH Instructions */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">KFINTECH:</p>
                <ol className="space-y-1 text-[13px] leading-snug text-muted-foreground">
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">1.</span>
                    <span>Open KFINTECH link → Enter PAN</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">2.</span>
                    <span>Select date range for financial year</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">3.</span>
                    <span>Download .xlsx file (may be password-protected)</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">4.</span>
                    <span>Upload below (enter password if prompted)</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CASUploadDialog({ onUploadSuccess }: CASUploadDialogProps) {
  const handleSuccess = (responses: unknown[]) => {
    // Extract financial years from responses
    const financialYears = responses
      .map((r: unknown) => (r as { financial_year?: string })?.financial_year)
      .filter((fy): fy is string => fy !== undefined);

    if (financialYears.length > 0) {
      onUploadSuccess?.(financialYears);
    }
  };

  return (
    <UploadDialog
      endpoint="/api/upload-cas"
      accept=".xls,.xlsx"
      multiple
      onSuccess={handleSuccess}
      formatSuccessMessage={(response) => {
        const fy = (response as { financial_year?: string })?.financial_year;
        return fy ? `Uploaded successfully (${fy})` : 'Uploaded successfully';
      }}
    >
      <UploadDialog.TriggerButton>Upload CAS Excel</UploadDialog.TriggerButton>

      <UploadDialog.Content>
        <UploadDialog.Header>
          <UploadDialog.Title>Upload Capital Gains Statement</UploadDialog.Title>
          <UploadDialog.Description>
            Upload your Capital Gains Excel files (.xls or .xlsx) from{' '}
            <a
              href="https://www.camsonline.com/Investors/Statements/Capital-Gain&Capital-Loss-statement"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors font-medium"
            >
              CAMS
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {' '}and{' '}
            <a
              href="https://mfs.kfintech.com/investor/General/CapitalGainsLossAccountStatement"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors font-medium"
            >
              KFINTECH
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            . You can upload both files at once. Financial year will be auto-detected.
          </UploadDialog.Description>
        </UploadDialog.Header>

        <UploadDialog.Body placeholder="Drag and drop your Excel files here">
          <CASInstructions />
        </UploadDialog.Body>
      </UploadDialog.Content>
    </UploadDialog>
  );
}
