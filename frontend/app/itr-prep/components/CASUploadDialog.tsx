'use client';

import { useState, useRef } from 'react';
import { Upload, ChevronRight, ExternalLink, Lock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputFile, InputFileHandle } from '@/components/ui/input-file';

interface CASUploadDialogProps {
  onUploadSuccess?: (financialYear: string) => void;
}

export function CASUploadDialog({ onUploadSuccess }: CASUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const inputFileRef = useRef<InputFileHandle>(null);

  const handleUploadAttempt = async (file: File, pwd?: string) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (pwd) {
      formData.append('password', pwd);
    }

    try {
      const response = await fetch('/api/upload-cas', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if password is required
        if (data.detail?.error === 'password_required') {
          setPasswordRequired(true);
          setSelectedFile(file);
          setError(null);
        } else {
          throw new Error(data.detail?.message || data.detail || 'Upload failed');
        }
      } else {
        // Success
        setUploadSuccess(true);
        setTimeout(() => {
          setOpen(false);
          onUploadSuccess?.(data.financial_year);
          handleReset();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setPasswordRequired(false);
    setPassword('');
    await handleUploadAttempt(file);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !password) return;
    await handleUploadAttempt(selectedFile, password);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPassword('');
    setPasswordRequired(false);
    setError(null);
    setUploadSuccess(false);
    setUploading(false);
    inputFileRef.current?.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="default">
          <Upload className="h-4 w-4 mr-2" />
          Upload CAS Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header with integrated links */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Upload Capital Gains Statement
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed mt-2">
            Upload your Capital Gains Excel file (.xls or .xlsx) from{' '}
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
            . Financial year will be auto-detected.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Password Required State */}
          {passwordRequired && (
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Password Protected File
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This Excel file is password-protected. Enter the password to decrypt and upload.
                    </p>
                  </div>
                  <form onSubmit={handlePasswordSubmit} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter file password"
                        className="bg-white dark:bg-slate-950"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Your password is only used to decrypt this file locally. It is not stored.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={!password || uploading}
                        size="sm"
                      >
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !passwordRequired && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Success Display */}
          {uploadSuccess && (
            <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                Upload successful! Redirecting...
              </p>
            </div>
          )}

          {/* Collapsible Instructions */}
          {!passwordRequired && !uploadSuccess && (
            <div className="space-y-2">
              <button
                onClick={() => setInstructionsOpen(!instructionsOpen)}
                className="group flex items-center gap-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 py-1.5 -ml-0.5"
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform duration-300 ease-out ${instructionsOpen ? 'rotate-90' : ''
                    }`}
                />
                <span>How to get your Capital Gains Statement</span>
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
          )}

          {/* Upload Area - only show if not in password mode and not success */}
          {!passwordRequired && !uploadSuccess && (
            <div className="pt-1 space-y-4">
              <InputFile
                ref={inputFileRef}
                accept=".xls,.xlsx"
                value={selectedFile}
                onChange={(file) => file && handleFileSelect(file)}
                disabled={uploading}
                placeholder="Drag and drop your Excel file here"
              />

              {/* Loading indicator */}
              {uploading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Excel file...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
