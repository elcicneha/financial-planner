'use client';

import { useState } from 'react';
import { Upload, ChevronRight, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputFile } from '@/components/ui/input-file';

interface CASUploadDialogProps {
  onUploadSuccess?: (financialYear: string) => void;
}

export function CASUploadDialog({ onUploadSuccess }: CASUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const handleUploadSuccess = (result?: any) => {
    setOpen(false);
    onUploadSuccess?.(result?.financial_year);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="default">
          <Upload className="h-4 w-4 mr-2" />
          Upload CAS JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header with integrated link */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Upload Capital Account Statement
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed mt-2">
            Upload your CAS JSON file from{' '}
            <a
              href="https://www.camsonline.com/Investors/Statements/Capital-Gain&Capital-Loss-statement"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors font-medium"
            >
              CAMS
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            . The financial year will be automatically detected.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Collapsible Instructions */}
          <div className="space-y-2">
            <button
              onClick={() => setInstructionsOpen(!instructionsOpen)}
              className="group flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 py-1.5 -ml-0.5"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-300 ease-out ${instructionsOpen ? 'rotate-90' : ''
                  }`}
              />
              <span>How to get your CAS file</span>
            </button>

            {/* Smooth expand/collapse using CSS Grid */}
            <div
              className={`grid transition-all duration-300 ease-out ${instructionsOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
                }`}
            >
              <div className="overflow-hidden">
                <div
                  className={`pl-5 pr-3 py-3 rounded-lg bg-muted/30 transition-colors duration-300 ${instructionsOpen
                    ? 'border-l-primary/50'
                    : 'border-l-transparent'
                    }`}
                >
                  <ol className="space-y-1 text-[13px] leading-snug text-muted-foreground">
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">1.</span>
                      <span>Open CAMS link → Enter email & PAN</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">2.</span>
                      <span>Select financial year</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">3.</span>
                      <span>Mutual funds → Select "All"</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">4.</span>
                      <span>File format → Select "JSON"</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">5.</span>
                      <span>Set password (for unzipping)</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">6.</span>
                      <span>Check email → Download zip file</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">7.</span>
                      <span>Unzip with your password</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="font-semibold text-foreground/70 min-w-[18px] text-xs">8.</span>
                      <span>Upload JSON file below</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Area - prominent spacing */}
          <div className="pt-1">
            <InputFile
              accept=".json"
              endpoint="/api/upload-cas"
              onSuccess={handleUploadSuccess}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
