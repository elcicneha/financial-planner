'use client';

import * as React from 'react';
import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Lock, X, Upload } from 'lucide-react';
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
  status: 'pending' | 'uploading' | 'password_required' | 'success' | 'error';
  password: string;
  error?: string;
  response?: unknown;
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

  // Actions
  handleFilesSelect: (files: File | File[] | null) => Promise<void>;
  handlePasswordSubmit: (index: number, e: React.FormEvent) => Promise<void>;
  updateFileState: (index: number, updates: Partial<FileUploadState>) => void;
  handleRemoveFile: (index: number) => void;
  handleReset: () => void;
  handleClose: () => void;

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
  const inputFileRef = useRef<InputFileHandle>(null!);

  const updateFileState = useCallback((index: number, updates: Partial<FileUploadState>) => {
    setFileStates(prev => prev.map((state, i) =>
      i === index ? { ...state, ...updates } : state
    ));
  }, []);

  // Batch upload: send all files in one request, parse per-file results
  const handleFilesSelect = useCallback(async (files: File | File[] | null) => {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    // Initialize all files as uploading
    const newStates: FileUploadState[] = fileArray.map(file => ({
      file,
      status: 'uploading',
      password: '',
    }));
    setFileStates(newStates);

    // Send all files in one batch request
    const formData = new FormData();
    fileArray.forEach(file => {
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

  const handleReset = useCallback(() => {
    setFileStates([]);
    inputFileRef.current?.reset();
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

  // Computed state
  const isUploading = fileStates.some(s => s.status === 'uploading' || s.status === 'pending');
  const allDone = fileStates.length > 0 && fileStates.every(s =>
    s.status === 'success' || s.status === 'error' || s.status === 'password_required'
  );
  const hasPasswordRequired = fileStates.some(s => s.status === 'password_required');
  const isIdle = fileStates.length === 0;

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
    handleFilesSelect,
    handlePasswordSubmit,
    updateFileState,
    handleRemoveFile,
    handleReset,
    handleClose,
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
  return (
    <DialogContent className={className ?? "sm:max-w-[560px] max-h-[85vh] flex flex-col gap-0 p-0"}>
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
    hasPasswordRequired,
    handleFilesSelect,
    handlePasswordSubmit,
    updateFileState,
    handleRemoveFile,
    handleReset,
    handleClose,
    inputFileRef,
  } = useUploadDialogContext();

  return (
    <div className={className ?? "flex-1 overflow-y-auto px-6 py-5"}>
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
                  {(fileState.status === 'uploading' || fileState.status === 'pending') && (
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

      {/* Idle Content (children) - shows when no files selected */}
      {isIdle && children}

      {/* Upload Area */}
      {(isIdle || (allDone && !hasPasswordRequired)) && (
        <div className="pt-1 space-y-4">
          {allDone && !hasPasswordRequired && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Upload More Files
              </Button>
            </div>
          )}
          {isIdle && (
            <InputFile
              ref={inputFileRef}
              accept={accept}
              multiple={multiple}
              onChange={handleFilesSelect}
              disabled={isUploading}
              placeholder={placeholder}
            />
          )}
        </div>
      )}

      {/* Done button */}
      {allDone && !hasPasswordRequired && (
        <div className="flex justify-end mt-4">
          <Button onClick={handleClose}>
            Done
          </Button>
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
