'use client';

import { useState, useRef } from 'react';
import { Upload, ChevronRight, ExternalLink, Lock, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
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
  onUploadSuccess?: (financialYears: string[]) => void;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'uploading' | 'password_required' | 'success' | 'error';
  password: string;
  error?: string;
  financialYear?: string;
}

export function CASUploadDialog({ onUploadSuccess }: CASUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const inputFileRef = useRef<InputFileHandle>(null);

  const updateFileState = (index: number, updates: Partial<FileUploadState>) => {
    setFileStates(prev => prev.map((state, i) =>
      i === index ? { ...state, ...updates } : state
    ));
  };

  const handleUploadAttempt = async (index: number, file: File, pwd?: string) => {
    updateFileState(index, { status: 'uploading', error: undefined });

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
        if (data.detail?.error === 'password_required') {
          updateFileState(index, { status: 'password_required' });
        } else {
          updateFileState(index, {
            status: 'error',
            error: data.detail?.message || data.detail || 'Upload failed'
          });
        }
      } else {
        updateFileState(index, {
          status: 'success',
          financialYear: data.financial_year
        });
      }
    } catch (err) {
      updateFileState(index, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed'
      });
    }
  };

  const handleFilesSelect = async (files: File | File[] | null) => {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];
    setSelectedFiles(fileArray);

    // Initialize file states
    const newStates: FileUploadState[] = fileArray.map(file => ({
      file,
      status: 'pending',
      password: '',
    }));
    setFileStates(newStates);

    // Start uploading all files
    for (let i = 0; i < fileArray.length; i++) {
      // Wait a small delay between uploads to avoid overwhelming the server
      if (i > 0) await new Promise(r => setTimeout(r, 100));
      handleUploadAttempt(i, fileArray[i]);
    }
  };

  const handlePasswordSubmit = async (index: number, e: React.FormEvent) => {
    e.preventDefault();
    const fileState = fileStates[index];
    if (!fileState || !fileState.password) return;
    await handleUploadAttempt(index, fileState.file, fileState.password);
  };

  const handleRemoveFile = (index: number) => {
    setFileStates(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setFileStates([]);
    inputFileRef.current?.reset();
  };

  const handleClose = () => {
    // Collect all successful financial years before closing
    const successfulFYs = fileStates
      .filter(s => s.status === 'success' && s.financialYear)
      .map(s => s.financialYear!);

    setOpen(false);
    // Delay reset to allow dialog close animation
    setTimeout(handleReset, 200);

    // Notify parent of all successful uploads
    if (successfulFYs.length > 0) {
      onUploadSuccess?.(successfulFYs);
    }
  };

  const allDone = fileStates.length > 0 && fileStates.every(
    s => s.status === 'success' || s.status === 'error'
  );

  const hasPasswordRequired = fileStates.some(s => s.status === 'password_required');
  const isUploading = fileStates.some(s => s.status === 'uploading');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
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
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* File Status List */}
          {fileStates.length > 0 && (
            <div className="space-y-3 mb-5">
              {fileStates.map((fileState, index) => (
                <div
                  key={`${fileState.file.name}-${index}`}
                  className={`p-4 rounded-lg border ${
                    fileState.status === 'success'
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : fileState.status === 'error'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      : fileState.status === 'password_required'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {fileState.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      )}
                      {fileState.status === 'pending' && (
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      )}
                      {fileState.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      {fileState.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      {fileState.status === 'password_required' && (
                        <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* File Info & Actions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{fileState.file.name}</p>
                        {(fileState.status === 'error' || fileState.status === 'password_required') && (
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>

                      {/* Status Messages */}
                      {fileState.status === 'uploading' && (
                        <p className="text-sm text-muted-foreground mt-1">Processing...</p>
                      )}
                      {fileState.status === 'success' && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Uploaded successfully{fileState.financialYear && ` (${fileState.financialYear})`}
                        </p>
                      )}
                      {fileState.status === 'error' && (
                        <div className="mt-1">
                          <p className="text-sm text-red-700 dark:text-red-300">{fileState.error}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadAttempt(index, fileState.file)}
                            className="mt-2"
                          >
                            Retry
                          </Button>
                        </div>
                      )}

                      {/* Password Form */}
                      {fileState.status === 'password_required' && (
                        <form onSubmit={(e) => handlePasswordSubmit(index, e)} className="mt-3 space-y-3">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            This file is password-protected. Enter the password to continue.
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor={`password-${index}`} className="text-sm font-medium">
                              Password
                            </Label>
                            <Input
                              id={`password-${index}`}
                              type="password"
                              value={fileState.password}
                              onChange={(e) => updateFileState(index, { password: e.target.value })}
                              placeholder="Enter file password"
                              className="bg-white dark:bg-slate-950"
                              autoFocus={index === fileStates.findIndex(s => s.status === 'password_required')}
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={!fileState.password}
                            size="sm"
                          >
                            Upload
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collapsible Instructions */}
          {fileStates.length === 0 && (
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

          {/* Upload Area - only show if no files selected or all done */}
          {(fileStates.length === 0 || allDone) && !hasPasswordRequired && (
            <div className="pt-1 space-y-4">
              {allDone && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Upload More Files
                  </Button>
                </div>
              )}
              {fileStates.length === 0 && (
                <InputFile
                  ref={inputFileRef}
                  accept=".xls,.xlsx"
                  multiple
                  value={selectedFiles}
                  onChange={handleFilesSelect}
                  disabled={isUploading}
                  placeholder="Drag and drop your Excel files here"
                />
              )}
            </div>
          )}

          {/* Close button when done */}
          {allDone && !hasPasswordRequired && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
