'use client';

import { useState, useRef } from 'react';
import { FileUp, Upload, CheckCircle, AlertCircle, Loader2, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface UploadResult {
  success: boolean;
  message: string;
  file_id: string;
  csv_path: string;
}

interface FileUploadProps {
  onSuccess?: () => void;
}

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are allowed';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setState('idle');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'uploading' && state !== 'success') {
      setState('dragging');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'dragging') {
      setState('idle');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'uploading' || state === 'success') return;
    setState('idle');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setState('uploading');
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }
      setResult(data);
      setState('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleZoneClick = () => {
    if (state !== 'uploading' && state !== 'success') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        className={cn(
          "border-2 border-dashed rounded-xl px-12 py-8 text-center transition-colors duration-200 h-[180px] flex items-center justify-center",
          state === 'idle' && !selectedFile && "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
          state === 'idle' && selectedFile && "border-primary/30 bg-primary/5 cursor-pointer",
          state === 'dragging' && "border-primary bg-primary/10 cursor-pointer",
          state === 'uploading' && "border-muted cursor-wait",
          state === 'success' && "border-green-500/50 bg-green-50 dark:bg-green-950/20 cursor-default",
          state === 'error' && "border-destructive/50 bg-red-50 dark:bg-red-950/20 cursor-pointer"
        )}
      >
        {/* Idle - No file */}
        {state === 'idle' && !selectedFile && (
          <div className="space-y-4">
            <div className="icon-container mx-auto w-fit">
              <FileUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-foreground font-medium">Drag and drop your PDF here</p>
              <p className="text-muted-foreground text-sm mt-1">or click to browse</p>
            </div>
          </div>
        )}

        {/* Idle - File selected */}
        {state === 'idle' && selectedFile && (
          <div className="space-y-4">
            <div className="icon-container mx-auto w-fit">
              <File className="h-6 w-6" />
            </div>
            <div>
              <p className="text-foreground font-medium">{selectedFile.name}</p>
              <p className="text-muted-foreground text-sm mt-1">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        )}

        {/* Dragging */}
        {state === 'dragging' && (
          <div className="space-y-4">
            <div className="icon-container mx-auto w-fit">
              <FileUp className="h-6 w-6" />
            </div>
            <p className="text-primary font-medium">Drop your PDF here</p>
          </div>
        )}

        {/* Uploading */}
        {state === 'uploading' && (
          <div className="space-y-4">
            <div className="icon-container mx-auto w-fit">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <p className="text-foreground font-medium">Uploading and processing...</p>
              <p className="text-muted-foreground text-sm mt-1">This may take a moment</p>
            </div>
          </div>
        )}

        {/* Success */}
        {state === 'success' && result && (
          <div className="space-y-4">
            <div className="icon-container-success mx-auto w-fit">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-success font-medium">Upload successful!</p>
              <p className="text-muted-foreground text-sm mt-2">
                File ID: <span className="font-mono">{result.file_id}</span>
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                CSV created at: <span className="font-mono">{result.csv_path}</span>
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/30 text-destructive mx-auto w-fit">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-destructive font-medium">Upload failed</p>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        {state === 'idle' && selectedFile && (
          <>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4" />
              Upload PDF
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <X className="h-4 w-4" />
              Remove
            </Button>
          </>
        )}
        {(state === 'success' || state === 'error') && (
          <Button variant={state === 'success' ? 'outline' : 'default'} onClick={handleReset}>
            {state === 'success' ? 'Upload Another' : 'Try Again'}
          </Button>
        )}
      </div>
    </div>
  );
}
