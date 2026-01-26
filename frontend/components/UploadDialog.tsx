'use client';

import * as React from 'react';
import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Lock, X, Upload, Archive, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputFile, InputFileHandle } from '@/components/ui/input-file';

// =============================================================================
// Types
// =============================================================================

interface FileUploadState {
  file: File;
  status: 'pending' | 'uploading' | 'password_required' | 'success' | 'error' | 'skipped';
  password: string;
  error?: string;
  response?: unknown;
  sourceZip?: string; // Name of zip file this was extracted from
}

interface ExtractedFile {
  file: File;
  sourceZip: string;
  rejected?: boolean;
  rejectionReason?: string;
}

interface ZipExtractionState {
  zipFiles: File[];
  status: 'extracting' | 'extracted' | 'error';
  extractedFiles: ExtractedFile[];
  errors: { zipName: string; error: string }[];
}

interface BatchResult {
  filename: string;
  success: boolean;
  financial_year?: string;
  password_required?: boolean;
  error?: string;
}

interface UploadDialogContextValue {
  // Config
  endpoint: string;
  accept: string;
  multiple: boolean;
  formatSuccessMessage?: (response: unknown) => string;

  // State
  fileStates: FileUploadState[];
  isUploading: boolean;
  isIdle: boolean;
  allDone: boolean;
  hasPasswordRequired: boolean;
  hasErrors: boolean;
  zipState: ZipExtractionState | null;

  // Actions
  handleFilesSelect: (files: File | File[] | null) => Promise<void>;
  handlePasswordSubmit: (index: number, e: React.FormEvent) => Promise<void>;
  updateFileState: (index: number, updates: Partial<FileUploadState>) => void;
  handleRemoveFile: (index: number) => void;
  handleReset: () => void;
  handleClose: () => void;
  handleCancelZip: () => void;

  // Refs
  inputFileRef: React.RefObject<InputFileHandle>;
}

const UploadDialogContext = createContext<UploadDialogContextValue | null>(null);

function useUploadDialogContext() {
  const context = useContext(UploadDialogContext);
  if (!context) {
    throw new Error('UploadDialog components must be used within UploadDialog');
  }
  return context;
}

// =============================================================================
// Root Component
// =============================================================================

interface UploadDialogProps {
  children: React.ReactNode;
  endpoint: string;
  accept?: string;
  multiple?: boolean;
  onSuccess?: (responses: unknown[]) => void;
  formatSuccessMessage?: (response: unknown) => string;
}

// Helper to check if a file extension matches the accept pattern
function matchesAccept(filename: string, accept: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  const patterns = accept.split(',').map(p => p.trim().toLowerCase());
  return patterns.some(pattern => {
    if (pattern === ext) return true;
    if (pattern === '.*') return true;
    // Handle wildcards like .xls*
    if (pattern.endsWith('*')) {
      const base = pattern.slice(0, -1);
      return ext.startsWith(base);
    }
    return false;
  });
}

function UploadDialogRoot({
  children,
  endpoint,
  accept = '.pdf',
  multiple = true,
  onSuccess,
  formatSuccessMessage,
}: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [zipState, setZipState] = useState<ZipExtractionState | null>(null);
  const inputFileRef = useRef<InputFileHandle>(null!);
  const toastShownRef = useRef(false);

  const updateFileState = useCallback((index: number, updates: Partial<FileUploadState>) => {
    setFileStates(prev => prev.map((state, i) =>
      i === index ? { ...state, ...updates } : state
    ));
  }, []);

  // Extract files from a zip archive
  const extractZipFiles = useCallback(async (zipFile: File): Promise<{ files: ExtractedFile[], error?: string }> => {
    try {
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const extractedFiles: ExtractedFile[] = [];
      const promises: Promise<void>[] = [];

      zip.forEach((relativePath, zipEntry) => {
        // Skip directories and hidden files
        if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.startsWith('.')) {
          return;
        }

        const filename = relativePath.split('/').pop() || relativePath;

        // Check if file matches accept pattern
        const isAccepted = accept === '.*' || accept === '*' || matchesAccept(filename, accept);

        promises.push(
          zipEntry.async('blob').then(blob => {
            const file = new File([blob], filename, { type: blob.type });
            extractedFiles.push({
              file,
              sourceZip: zipFile.name,
              rejected: !isAccepted,
              rejectionReason: !isAccepted ? 'Unsupported format' : undefined,
            });
          }).catch(() => {
            // Individual file extraction failed (might be encrypted)
          })
        );
      });

      await Promise.all(promises);

      if (extractedFiles.length === 0) {
        return { files: [], error: 'No files found in zip (or zip may be password-protected)' };
      }

      return { files: extractedFiles };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract zip';
      if (errorMessage.includes('Encrypted') || errorMessage.includes('password')) {
        return { files: [], error: 'Password-protected zip files are not supported. Please extract files manually.' };
      }
      return { files: [], error: errorMessage };
    }
  }, [accept]);

  // Check if file is a zip
  const isZipFile = (file: File) => {
    return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
  };

  // Upload files to the endpoint
  const uploadFiles = useCallback(async (filesToUpload: (File | ExtractedFile)[], rejectedFiles: ExtractedFile[] = []) => {
    // Normalize to ExtractedFile format (filter out rejected if mixed)
    const normalizedFiles = filesToUpload
      .map(f => 'sourceZip' in f ? f : { file: f, sourceZip: undefined, rejected: false, rejectionReason: undefined })
      .filter(f => !f.rejected);

    // Initialize all files as uploading, plus rejected files as 'skipped'
    const uploadStates: FileUploadState[] = normalizedFiles.map(({ file, sourceZip }) => ({
      file,
      status: 'uploading' as const,
      password: '',
      sourceZip,
    }));

    // Add rejected files with 'skipped' status (we'll show them but not upload)
    const skippedStates: FileUploadState[] = rejectedFiles.map(({ file, sourceZip, rejectionReason }) => ({
      file,
      status: 'skipped' as const,
      password: '',
      sourceZip,
      error: rejectionReason || 'Unsupported format',
    }));

    setFileStates([...uploadStates, ...skippedStates]);

    // If no files to actually upload, we're done
    if (normalizedFiles.length === 0) {
      return;
    }

    // Send all files in one batch request
    const formData = new FormData();
    normalizedFiles.forEach(({ file }) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Entire request failed
        const errorMsg = data.detail?.message || data.detail || 'Upload failed';
        setFileStates(prev => prev.map(s => ({ ...s, status: 'error', error: errorMsg })));
        return;
      }

      // Parse batch results and update each file's state
      const results: BatchResult[] = data.results || [];

      setFileStates(prev => prev.map((state) => {
        const result = results.find(r => r.filename === state.file.name);
        if (!result) {
          return { ...state, status: 'error', error: 'No result returned for this file' };
        }

        if (result.success) {
          return { ...state, status: 'success', response: result };
        } else if (result.password_required) {
          return { ...state, status: 'password_required' };
        } else {
          return { ...state, status: 'error', error: result.error || 'Upload failed' };
        }
      }));

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setFileStates(prev => prev.map(s => ({ ...s, status: 'error', error: errorMsg })));
    }
  }, [endpoint]);

  // Batch upload: send all files in one request, parse per-file results
  const handleFilesSelect = useCallback(async (files: File | File[] | null) => {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    // Check for zip files
    const zipFilesSelected = fileArray.filter(isZipFile);
    const regularFiles = fileArray.filter(f => !isZipFile(f));

    // Collect all files to upload
    let allFilesToUpload: (File | ExtractedFile)[] = [...regularFiles];
    let allRejectedFiles: ExtractedFile[] = [];

    // If there are zip files, extract them all first
    if (zipFilesSelected.length > 0) {
      setZipState({
        zipFiles: zipFilesSelected,
        status: 'extracting',
        extractedFiles: [],
        errors: [],
      });

      // Extract all zips in parallel
      const results = await Promise.all(
        zipFilesSelected.map(async (zipFile) => ({
          zipFile,
          result: await extractZipFiles(zipFile),
        }))
      );

      // Combine results
      const errors: { zipName: string; error: string }[] = [];

      for (const { zipFile, result } of results) {
        if (result.error) {
          errors.push({ zipName: zipFile.name, error: result.error });
        } else {
          // Separate accepted and rejected files
          const accepted = result.files.filter(f => !f.rejected);
          const rejected = result.files.filter(f => f.rejected);
          allFilesToUpload.push(...accepted);
          allRejectedFiles.push(...rejected);
        }
      }

      // If all zips failed with no files at all
      if (allFilesToUpload.length === 0 && allRejectedFiles.length === 0 && errors.length > 0) {
        setZipState({
          zipFiles: zipFilesSelected,
          status: 'error',
          extractedFiles: [],
          errors,
        });
        return;
      }

      // Clear zip state - we're done extracting
      setZipState(null);

      // If there were some zip-level errors but we have files, store errors for display
      if (errors.length > 0) {
        // We could show these errors inline, but for now we proceed with what we have
        console.warn('Some zips failed to extract:', errors);
      }
    }

    // Auto-upload all collected files (regular + extracted from zips)
    if (allFilesToUpload.length > 0 || allRejectedFiles.length > 0) {
      await uploadFiles(allFilesToUpload, allRejectedFiles);
    }
  }, [extractZipFiles, uploadFiles]);

  // Password retry: send single file with password
  const handlePasswordSubmit = useCallback(async (index: number, e: React.FormEvent) => {
    e.preventDefault();
    const fileState = fileStates[index];
    if (!fileState || !fileState.password) return;

    updateFileState(index, { status: 'uploading', error: undefined });

    const formData = new FormData();
    formData.append('file', fileState.file);
    formData.append('password', fileState.password);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        updateFileState(index, {
          status: 'error',
          error: data.detail?.message || data.detail || 'Upload failed'
        });
        return;
      }

      // Parse single result from batch response
      const results: BatchResult[] = data.results || [];
      const result = results[0];

      if (result?.success) {
        updateFileState(index, { status: 'success', response: result });
      } else {
        updateFileState(index, {
          status: 'error',
          error: result?.error || 'Wrong password or upload failed'
        });
      }

    } catch (err) {
      updateFileState(index, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed'
      });
    }
  }, [endpoint, fileStates, updateFileState]);

  const handleRemoveFile = useCallback((index: number) => {
    setFileStates(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Cancel/dismiss zip extraction error
  const handleCancelZip = useCallback(() => {
    setZipState(null);
  }, []);

  const handleReset = useCallback(() => {
    setFileStates([]);
    setZipState(null);
    inputFileRef.current?.reset();
    toastShownRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);

    // Collect successful responses
    const successResponses = fileStates
      .filter(s => s.status === 'success' && s.response)
      .map(s => s.response!);

    if (successResponses.length > 0) {
      onSuccess?.(successResponses);
    }

    setTimeout(handleReset, 200);
  }, [fileStates, onSuccess, handleReset]);

  // Auto-close on successful upload (unless password required or has errors)
  React.useEffect(() => {
    if (fileStates.length === 0) return;

    const hasPasswordRequired = fileStates.some(s => s.status === 'password_required');
    const hasErrors = fileStates.some(s => s.status === 'error');
    const allDone = fileStates.every(s =>
      s.status === 'success' || s.status === 'error' || s.status === 'password_required' || s.status === 'skipped'
    );

    // Auto-close if all succeeded (no password prompts, no errors)
    if (allDone && !hasPasswordRequired && !hasErrors && !toastShownRef.current) {
      const successCount = fileStates.filter(s => s.status === 'success').length;
      const skippedCount = fileStates.filter(s => s.status === 'skipped').length;

      // Show toast notification
      const parts: string[] = [];
      if (successCount > 0) {
        parts.push(`${successCount} file${successCount !== 1 ? 's' : ''} processed`);
      }
      if (skippedCount > 0) {
        parts.push(`${skippedCount} skipped`);
      }

      if (parts.length > 0) {
        toast.success('Upload complete', {
          description: parts.join(', '),
        });
        toastShownRef.current = true;
      }

      // Small delay to let user see success state before closing
      const timer = setTimeout(() => {
        handleClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [fileStates, handleClose]);

  // Computed state
  const isUploading = fileStates.some(s => s.status === 'uploading' || s.status === 'pending');
  const allDone = fileStates.length > 0 && fileStates.every(s =>
    s.status === 'success' || s.status === 'error' || s.status === 'password_required' || s.status === 'skipped'
  );
  const hasPasswordRequired = fileStates.some(s => s.status === 'password_required');
  const hasErrors = fileStates.some(s => s.status === 'error');
  const isIdle = fileStates.length === 0 && zipState === null;

  const contextValue: UploadDialogContextValue = {
    endpoint,
    accept,
    multiple,
    formatSuccessMessage,
    fileStates,
    isUploading,
    isIdle,
    allDone,
    hasPasswordRequired,
    hasErrors,
    zipState,
    handleFilesSelect,
    handlePasswordSubmit,
    updateFileState,
    handleRemoveFile,
    handleReset,
    handleClose,
    handleCancelZip,
    inputFileRef,
  };

  return (
    <UploadDialogContext.Provider value={contextValue}>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else setOpen(true);
      }}>
        {children}
      </Dialog>
    </UploadDialogContext.Provider>
  );
}

// =============================================================================
// Subcomponents
// =============================================================================

const UploadDialogTrigger = DialogTrigger;

interface UploadDialogTriggerButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ElementType;
  iconOnly?: boolean;
}

function UploadDialogTriggerButton({
  children,
  icon: Icon = Upload,
  iconOnly = false,
  ...buttonProps
}: UploadDialogTriggerButtonProps) {
  return (
    <DialogTrigger asChild>
      <Button {...buttonProps}>
        <Icon className="h-4 w-4" />
        {!iconOnly && children}
      </Button>
    </DialogTrigger>
  );
}

interface UploadDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

function UploadDialogContent({ children, className }: UploadDialogContentProps) {
  const { inputFileRef } = useUploadDialogContext();

  return (
    <DialogContent
      className={className ?? "sm:max-w-[560px] max-h-[85vh] flex flex-col gap-0 p-0"}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        // Focus the input file when dialog opens
        inputFileRef.current?.focus();
      }}
    >
      {children}
    </DialogContent>
  );
}

interface UploadDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function UploadDialogHeader({ children, className }: UploadDialogHeaderProps) {
  return (
    <DialogHeader className={className ?? "px-6 pt-6 pb-4 border-b border-border/40"}>
      {children}
    </DialogHeader>
  );
}

function UploadDialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogTitle className={className ?? "text-2xl font-semibold tracking-tight"}>
      {children}
    </DialogTitle>
  );
}

function UploadDialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogDescription className={className ?? "text-[15px] leading-relaxed mt-2"}>
      {children}
    </DialogDescription>
  );
}

// =============================================================================
// Body Component - Handles all upload UI
// =============================================================================

interface UploadDialogBodyProps {
  children?: React.ReactNode; // Idle content (shows before input when no files)
  placeholder?: string;
  className?: string;
}

function UploadDialogBody({ children, placeholder = 'Drag and drop your files here', className }: UploadDialogBodyProps) {
  const {
    accept,
    multiple,
    formatSuccessMessage,
    fileStates,
    isUploading,
    isIdle,
    allDone,
    hasErrors,
    zipState,
    handleFilesSelect,
    handlePasswordSubmit,
    updateFileState,
    handleRemoveFile,
    handleCancelZip,
    inputFileRef,
  } = useUploadDialogContext();

  // Compute file counts for summary
  const counts = React.useMemo(() => {
    const total = fileStates.length;
    const success = fileStates.filter(s => s.status === 'success').length;
    const failed = fileStates.filter(s => s.status === 'error').length;
    const skipped = fileStates.filter(s => s.status === 'skipped').length;
    const pending = fileStates.filter(s => s.status === 'uploading' || s.status === 'pending').length;
    const passwordRequired = fileStates.filter(s => s.status === 'password_required').length;
    return { total, success, failed, skipped, pending, passwordRequired };
  }, [fileStates]);

  return (
    <div className={className ?? "flex-1 overflow-y-auto px-6 py-5"}>
      {/* File Status List */}
      {fileStates.length > 0 && (
        <div className="space-y-3 mb-5">
          {/* Summary header */}
          {fileStates.length > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b border-border/50">
              <span className="font-medium">
                {counts.total} file{counts.total !== 1 ? 's' : ''}
              </span>
              {allDone && (
                <div className="flex items-center gap-3 text-xs">
                  {counts.success > 0 && (
                    <span className="text-green-600 dark:text-green-400">{counts.success} uploaded</span>
                  )}
                  {counts.skipped > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">{counts.skipped} skipped</span>
                  )}
                  {counts.failed > 0 && (
                    <span className="text-red-600 dark:text-red-400">{counts.failed} failed</span>
                  )}
                </div>
              )}
              {!allDone && counts.pending > 0 && (
                <span className="text-xs">Processing {counts.pending}...</span>
              )}
            </div>
          )}
          {fileStates.map((fileState, index) => (
            <div
              key={`${fileState.file.name}-${index}`}
              className={`p-4 rounded-lg border transition-all ${
                fileState.status === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  : fileState.status === 'error'
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  : fileState.status === 'skipped'
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40 opacity-75'
                  : fileState.status === 'password_required'
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {(fileState.status === 'uploading' || fileState.status === 'pending') && (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  )}
                  {fileState.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                  {fileState.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  {fileState.status === 'skipped' && (
                    <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  )}
                  {fileState.status === 'password_required' && (
                    <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>

                {/* File Info & Actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${fileState.status === 'skipped' ? 'text-muted-foreground' : ''}`}>
                      {fileState.file.name}
                    </p>
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
                  {(fileState.status === 'uploading' || fileState.status === 'pending') && (
                    <p className="text-sm text-muted-foreground mt-1">Processing...</p>
                  )}
                  {fileState.status === 'success' && (
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {formatSuccessMessage
                        ? formatSuccessMessage(fileState.response)
                        : 'Uploaded successfully'}
                    </p>
                  )}
                  {fileState.status === 'error' && (
                    <div className="mt-1">
                      <p className="text-sm text-red-700 dark:text-red-300">{fileState.error}</p>
                    </div>
                  )}
                  {fileState.status === 'skipped' && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      {fileState.error || 'Skipped'} — not uploaded
                    </p>
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
                      <Button type="submit" disabled={!fileState.password} size="sm">
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

      {/* Zip Extraction State - only shows during extraction or on error */}
      {zipState && (
        <div className="space-y-4 mb-5">
          {/* Extracting */}
          {zipState.status === 'extracting' && (
            <div className="p-4 rounded-lg border bg-muted/30 border-border">
              <div className="flex items-center gap-3">
                <Archive className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {zipState.zipFiles.length === 1
                      ? zipState.zipFiles[0].name
                      : `${zipState.zipFiles.length} zip files`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Extracting files...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extraction Error */}
          {zipState.status === 'error' && (
            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {zipState.zipFiles.length === 1
                      ? zipState.zipFiles[0].name
                      : `${zipState.zipFiles.length} zip files`}
                  </p>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {zipState.errors.map((err, i) => (
                      <p key={i}>{zipState.errors.length > 1 ? `${err.zipName}: ` : ''}{err.error}</p>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleCancelZip}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Idle Content (children) - shows when no files selected */}
      {isIdle && children}

      {/* Upload Area - show when idle or when there are errors (so users can retry with another file) */}
      {(isIdle || hasErrors) && (
        <div className="pt-1">
          <InputFile
            ref={inputFileRef}
            accept={multiple ? `${accept},.zip` : accept}
            multiple={multiple}
            onChange={handleFilesSelect}
            disabled={isUploading}
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export const UploadDialog = Object.assign(UploadDialogRoot, {
  Trigger: UploadDialogTrigger,
  TriggerButton: UploadDialogTriggerButton,
  Content: UploadDialogContent,
  Header: UploadDialogHeader,
  Title: UploadDialogTitle,
  Description: UploadDialogDescription,
  Body: UploadDialogBody,
});

// =============================================================================
// Example Usage
// =============================================================================
//
// Basic usage with TriggerButton (recommended):
// ---------------------------------------------
// <UploadDialog endpoint="/api/upload" accept=".pdf" onSuccess={handleSuccess}>
//   <UploadDialog.TriggerButton>Upload Files</UploadDialog.TriggerButton>
//   <UploadDialog.Content>
//     <UploadDialog.Header>
//       <UploadDialog.Title>Upload</UploadDialog.Title>
//       <UploadDialog.Description>Upload your files here</UploadDialog.Description>
//     </UploadDialog.Header>
//     <UploadDialog.Body placeholder="Drag and drop files here" />
//   </UploadDialog.Content>
// </UploadDialog>
//
// TriggerButton variants and sizes:
// ---------------------------------
// <UploadDialog.TriggerButton variant="outline" size="sm">Upload</UploadDialog.TriggerButton>
// <UploadDialog.TriggerButton variant="ghost" size="lg">Upload</UploadDialog.TriggerButton>
//
// Icon-only button:
// -----------------
// <UploadDialog.TriggerButton iconOnly />
//
// Custom icon:
// ------------
// import { FileUp } from 'lucide-react';
// <UploadDialog.TriggerButton icon={FileUp}>Upload</UploadDialog.TriggerButton>
//
// Fully custom trigger (for complete control):
// --------------------------------------------
// <UploadDialog.Trigger asChild>
//   <MyCustomButton>Whatever you want</MyCustomButton>
// </UploadDialog.Trigger>
//
// Body with custom idle content (shown before file selection):
// ------------------------------------------------------------
// <UploadDialog.Body placeholder="Drag and drop files here">
//   <MyInstructionsComponent />
//   <p className="text-sm text-muted-foreground">Any content here shows when idle</p>
// </UploadDialog.Body>
//
// Custom success message formatting:
// ----------------------------------
// <UploadDialog
//   endpoint="/api/upload"
//   formatSuccessMessage={(response) => {
//     const data = response as { name: string };
//     return `Uploaded: ${data.name}`;
//   }}
// >
//
// Multiple files vs single file:
// ------------------------------
// <UploadDialog endpoint="/api/upload" multiple>        {/* allows multiple files */}
// <UploadDialog endpoint="/api/upload" multiple={false}> {/* single file only */}
