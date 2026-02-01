'use client';

import * as React from 'react';
import { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { Loader2, CheckCircle2, XCircle, Lock, X, Upload, Archive, AlertTriangle, ChevronRight } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

interface FileUploadState {
  id: string;
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
      id: crypto.randomUUID(),
      file,
      status: 'uploading' as const,
      password: '',
      sourceZip,
    }));

    // Add rejected files with 'skipped' status (we'll show them but not upload)
    const skippedStates: FileUploadState[] = rejectedFiles.map(({ file, sourceZip, rejectionReason }) => ({
      id: crypto.randomUUID(),
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
    const fieldName = multiple ? 'files' : 'file';
    normalizedFiles.forEach(({ file }) => {
      formData.append(fieldName, file);
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Entire request failed
        let errorMsg = 'Upload failed';
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            // FastAPI validation errors: array of {type, loc, msg, input}
            errorMsg = data.detail.map((err: { msg?: string }) => err.msg).filter(Boolean).join(', ') || 'Validation error';
          } else if (typeof data.detail === 'object' && data.detail.message) {
            errorMsg = data.detail.message;
          } else if (typeof data.detail === 'object' && data.detail.msg) {
            // Single validation error object
            errorMsg = data.detail.msg;
          }
        }
        setFileStates(prev => prev.map(s => ({ ...s, status: 'error', error: errorMsg })));
        return;
      }

      // Parse results - handle both batch and single file responses
      const results: BatchResult[] = data.results || [
        {
          filename: normalizedFiles[0]?.file.name || 'unknown',
          success: data.success !== false,
          financial_year: data.financial_year,
          password_required: data.password_required,
          error: data.error,
        }
      ];

      // Create a Map for O(1) lookups instead of O(n) find() calls
      const resultMap = new Map(results.map(r => [r.filename, r]));

      setFileStates(prev => prev.map((state) => {
        const result = resultMap.get(state.file.name);
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
        let errorMsg = 'Upload failed';
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            // FastAPI validation errors: array of {type, loc, msg, input}
            errorMsg = data.detail.map((err: { msg?: string }) => err.msg).filter(Boolean).join(', ') || 'Validation error';
          } else if (typeof data.detail === 'object' && data.detail.message) {
            errorMsg = data.detail.message;
          } else if (typeof data.detail === 'object' && data.detail.msg) {
            // Single validation error object
            errorMsg = data.detail.msg;
          }
        }
        updateFileState(index, {
          status: 'error',
          error: errorMsg
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

  // Memoized computed state
  const isUploading = useMemo(() =>
    fileStates.some(s => s.status === 'uploading' || s.status === 'pending'),
    [fileStates]
  );

  const allDone = useMemo(() =>
    fileStates.length > 0 && fileStates.every(s =>
      s.status === 'success' || s.status === 'error' || s.status === 'password_required' || s.status === 'skipped'
    ),
    [fileStates]
  );

  const hasPasswordRequired = useMemo(() =>
    fileStates.some(s => s.status === 'password_required'),
    [fileStates]
  );

  const hasErrors = useMemo(() =>
    fileStates.some(s => s.status === 'error'),
    [fileStates]
  );

  const isIdle = useMemo(() =>
    fileStates.length === 0 && zipState === null,
    [fileStates.length, zipState]
  );

  const contextValue = useMemo<UploadDialogContextValue>(() => ({
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
  }), [
    endpoint, accept, multiple, formatSuccessMessage,
    fileStates, isUploading, isIdle, allDone,
    hasPasswordRequired, hasErrors, zipState,
    handleFilesSelect, handlePasswordSubmit, updateFileState,
    handleRemoveFile, handleReset, handleClose, handleCancelZip
  ]);

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
        <Icon className="size-4" />
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
// Status Group Component - Collapsible group of files with same status
// =============================================================================

interface StatusGroupProps {
  status: 'success' | 'error' | 'skipped';
  count: number;
  icon: React.ElementType;
  label: string;
  files: FileUploadState[];
  formatSuccessMessage?: (response: unknown) => string;
  onRemoveFile?: (index: number) => void;
  allFileStates?: FileUploadState[];
}

function StatusGroup({
  status,
  count,
  icon: Icon,
  label,
  files,
  formatSuccessMessage,
  onRemoveFile,
  allFileStates = []
}: StatusGroupProps) {
  const [isOpen, setIsOpen] = useState(false);

  const statusStyles = {
    success: {
      container: 'bg-success-muted border-success/30',
      icon: 'text-success',
      badge: 'bg-success text-success-foreground',
    },
    error: {
      container: 'bg-destructive-muted border-destructive/30',
      icon: 'text-destructive',
      badge: 'bg-destructive text-destructive-foreground',
    },
    skipped: {
      container: 'bg-warning-muted border-warning/30',
      icon: 'text-warning',
      badge: 'bg-warning text-warning-foreground',
    },
  };

  const styles = statusStyles[status];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`rounded-lg border transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${styles.container}`}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 h-auto flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 justify-start"
          >
            <Icon className={`size-5 ${styles.icon} flex-shrink-0`} />
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <Badge className={`${styles.badge} text-xs`}>
                  {String(count)}
                </Badge>
                <span className="text-sm text-muted-foreground truncate">{label}</span>
              </div>
            </div>
            <ChevronRight
              className={`size-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-90' : ''
                }`}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2 border-t border-current/10">
            {files.map((file) => {
              const originalIndex = allFileStates.findIndex(f => f.id === file.id);
              return (
                <div
                  key={file.id}
                  className="pt-3 flex items-start gap-2.5 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    {status === 'success' && file.response && formatSuccessMessage ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatSuccessMessage(file.response)}
                      </p>
                    ) : null}
                  </div>
                  {status === 'error' && onRemoveFile && originalIndex !== -1 && (
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => onRemoveFile(originalIndex)}
                      className="opacity-0 group-hover:opacity-100 size-7"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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

// Helper to group files by error message
function groupFilesByError(files: FileUploadState[]) {
  const groups = new Map<string, FileUploadState[]>();
  files.forEach(file => {
    const errorKey = file.error || 'Unknown error';
    if (!groups.has(errorKey)) {
      groups.set(errorKey, []);
    }
    groups.get(errorKey)!.push(file);
  });
  return Array.from(groups.entries()).map(([error, files]) => ({ error, files }));
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

  // Group files by status
  const groupedFiles = React.useMemo(() => {
    const uploading = fileStates.filter(s => s.status === 'uploading' || s.status === 'pending');
    const success = fileStates.filter(s => s.status === 'success');
    const errors = fileStates.filter(s => s.status === 'error');
    const skipped = fileStates.filter(s => s.status === 'skipped');
    const passwordRequired = fileStates.filter(s => s.status === 'password_required');

    // Group errors by error message
    const errorGroups = groupFilesByError(errors);
    const skippedGroups = groupFilesByError(skipped);

    return { uploading, success, errorGroups, skippedGroups, passwordRequired };
  }, [fileStates]);

  // Compute file counts for summary
  const counts = React.useMemo(() => {
    const total = fileStates.length;
    const success = groupedFiles.success.length;
    const failed = groupedFiles.errorGroups.reduce((sum, g) => sum + g.files.length, 0);
    const skipped = groupedFiles.skippedGroups.reduce((sum, g) => sum + g.files.length, 0);
    const pending = groupedFiles.uploading.length;
    const passwordRequired = groupedFiles.passwordRequired.length;
    return { total, success, failed, skipped, pending, passwordRequired };
  }, [groupedFiles]);

  return (
    <div className={className ?? "flex-1 overflow-y-auto px-6 py-5"}>
      {/* File Status List */}
      {fileStates.length > 0 && (
        <div className="space-y-3 mb-5 transition-all duration-200">
          {/* Summary header */}
          {fileStates.length > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b border-border/50">
              <span className="font-medium">
                {counts.total} file{counts.total !== 1 ? 's' : ''}
              </span>
              {allDone && (
                <div className="flex items-center gap-3 text-xs">
                  {counts.success > 0 && (
                    <span className="text-success">{counts.success} uploaded</span>
                  )}
                  {counts.skipped > 0 && (
                    <span className="text-warning">{counts.skipped} skipped</span>
                  )}
                  {counts.failed > 0 && (
                    <span className="text-destructive">{counts.failed} failed</span>
                  )}
                </div>
              )}
              {!allDone && counts.pending > 0 && (
                <span className="text-xs">Processing {counts.pending}...</span>
              )}
            </div>
          )}

          {/* Uploading Files - Show as group to prevent flash */}
          {groupedFiles.uploading.length > 0 && (
            <div className="p-4 rounded-lg border bg-muted/30 border-border transition-all animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 text-muted-foreground animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-muted-foreground text-background text-xs">
                      {String(groupedFiles.uploading.length)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {groupedFiles.uploading.map((fileState, index) => (
                      <p key={`uploading-${index}`} className="text-xs text-muted-foreground truncate">
                        {fileState.file.name}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Group - Collapsible */}
          {groupedFiles.success.length > 0 && (
            <StatusGroup
              status="success"
              count={groupedFiles.success.length}
              icon={CheckCircle2}
              label="Uploaded successfully"
              files={groupedFiles.success}
              formatSuccessMessage={formatSuccessMessage}
            />
          )}

          {/* Error Groups - Collapsible by error type */}
          {groupedFiles.errorGroups.map((group, groupIndex) => (
            <StatusGroup
              key={`error-${groupIndex}`}
              status="error"
              count={group.files.length}
              icon={XCircle}
              label={group.error}
              files={group.files}
              onRemoveFile={handleRemoveFile}
              allFileStates={fileStates}
            />
          ))}

          {/* Skipped Groups - Collapsible by reason */}
          {groupedFiles.skippedGroups.map((group, groupIndex) => (
            <StatusGroup
              key={`skipped-${groupIndex}`}
              status="skipped"
              count={group.files.length}
              icon={AlertTriangle}
              label={group.error}
              files={group.files}
            />
          ))}

          {/* Password Required Files - Show individually with form */}
          {groupedFiles.passwordRequired.map((fileState) => {
            const originalIndex = fileStates.findIndex(f => f === fileState);
            return (
              <div
                key={`password-${fileState.file.name}`}
                className="p-4 rounded-lg border bg-accent/30 border-accent-foreground/20 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex items-start gap-3">
                  <Lock className="size-5 text-accent-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{fileState.file.name}</p>
                      <button
                        onClick={() => handleRemoveFile(originalIndex)}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                      >
                        <X className="size-4 text-muted-foreground" />
                      </button>
                    </div>
                    <form onSubmit={(e) => handlePasswordSubmit(originalIndex, e)} className="mt-3 space-y-3">
                      <p className="text-sm text-accent-foreground">
                        This file is password-protected. Enter the password to continue.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor={`password-${originalIndex}`} className="text-sm font-medium">
                          Password
                        </Label>
                        <Input
                          id={`password-${originalIndex}`}
                          type="password"
                          value={fileState.password}
                          onChange={(e) => updateFileState(originalIndex, { password: e.target.value })}
                          placeholder="Enter file password"
                          className="bg-background"
                          autoFocus={originalIndex === fileStates.findIndex(s => s.status === 'password_required')}
                        />
                      </div>
                      <Button type="submit" disabled={!fileState.password} size="sm">
                        Upload
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Zip Extraction State - only shows during extraction or on error */}
      {zipState && (
        <div className="space-y-4 mb-5">
          {/* Extracting */}
          {zipState.status === 'extracting' && (
            <div className="p-4 rounded-lg border bg-muted/30 border-border">
              <div className="flex items-center gap-3">
                <Archive className="size-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {zipState.zipFiles.length === 1
                      ? zipState.zipFiles[0].name
                      : `${zipState.zipFiles.length} zip files`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
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
                <XCircle className="size-5 text-red-600 dark:text-red-400 mt-0.5" />
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
// Footer Component - Shows Done button for partial success or errors
// =============================================================================

function UploadDialogFooter({ className }: { className?: string }) {
  const { fileStates, allDone, hasPasswordRequired, hasErrors, handleClose } = useUploadDialogContext();

  // Show footer when: all done, has errors, and not waiting for passwords
  const showFooter = allDone && hasErrors && !hasPasswordRequired;

  if (!showFooter) return null;

  const successCount = fileStates.filter(s => s.status === 'success').length;

  return (
    <div className={className ?? "px-6 py-4 border-t border-border/40 flex items-center justify-between bg-muted/20"}>
      <p className="text-sm text-muted-foreground">
        {successCount > 0 ? (
          <span>
            <span className="font-medium">{successCount}</span> file{successCount !== 1 ? 's' : ''} uploaded successfully
          </span>
        ) : (
          <span>Upload incomplete</span>
        )}
      </p>
      <Button onClick={handleClose}>
        Done
      </Button>
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
  Footer: UploadDialogFooter,
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
//     <UploadDialog.Footer />
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
