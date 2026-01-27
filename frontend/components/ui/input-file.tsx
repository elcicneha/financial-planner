'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { FileUp, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export interface InputFileProps {
  /** Accepted file extensions (e.g., '.pdf,.json') */
  accept?: string;
  /** Current selected file(s) (controlled) */
  value?: File | File[] | null;
  /** Callback when file(s) are selected */
  onChange?: (file: File | File[] | null) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Placeholder text when no file selected */
  placeholder?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
}

export interface InputFileHandle {
  reset: () => void;
  focus: () => void;
  click: () => void;
}

export const InputFile = forwardRef<InputFileHandle, InputFileProps>(
  (
    {
      accept = '.pdf',
      value = null,
      onChange,
      disabled = false,
      className,
      placeholder = 'Drag and drop your file here',
      multiple = false,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLButtonElement>(null);

    // Helper to check if we have files
    const hasFiles = multiple
      ? Array.isArray(value) && value.length > 0
      : value !== null && !Array.isArray(value);

    const files = multiple
      ? (Array.isArray(value) ? value : [])
      : (value && !Array.isArray(value) ? [value] : []);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onChange?.(null);
      },
      focus: () => {
        dropZoneRef.current?.focus();
      },
      click: () => {
        fileInputRef.current?.click();
      },
    }));

    const handleFileSelect = (selectedFiles: FileList) => {
      if (multiple) {
        const existingFiles = Array.isArray(value) ? value : [];
        const newFiles = Array.from(selectedFiles);
        onChange?.([...existingFiles, ...newFiles]);
      } else {
        onChange?.(selectedFiles[0]);
      }
    };

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFileSelect(droppedFiles);
      }
    };

    const handleZoneClick = () => {
      if (!disabled) {
        fileInputRef.current?.click();
      }
    };

    return (
      <div className={cn('space-y-4', className)}>
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && e.target.files.length > 0 && handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <button
          ref={dropZoneRef}
          type="button"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleZoneClick}
          disabled={disabled}
          className={cn(
            'w-full border-2 border-dashed rounded-xl px-12 py-8 text-center transition-colors duration-200 h-[180px] flex items-center justify-center',
            'focus-ring',
            !hasFiles && !isDragging && 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer',
            hasFiles && !isDragging && 'border-primary/30 bg-primary/5 cursor-pointer',
            isDragging && 'border-primary bg-primary/10 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
          )}
        >
          {/* Idle - No file */}
          {!hasFiles && !isDragging && (
            <div className="space-y-4">
              <div className="icon-container mx-auto w-fit">
                <FileUp className="size-6" />
              </div>
              <div>
                <p className="text-foreground font-medium">{placeholder}</p>
                <p className="text-muted-foreground text-sm mt-1">or click to browse</p>
              </div>
            </div>
          )}

          {/* Dragging */}
          {isDragging && (
            <div className="space-y-4">
              <div className="icon-container mx-auto w-fit">
                <FileUp className="size-6" />
              </div>
              <p className="text-primary font-medium">Drop your file here</p>
            </div>
          )}

          {/* File(s) selected */}
          {hasFiles && !isDragging && (
            <div className="space-y-4">
              <div className="icon-container mx-auto w-fit">
                <FileIcon className="size-6" />
              </div>
              <div>
                {files.length === 1 ? (
                  <>
                    <p className="text-foreground font-medium">{files[0].name}</p>
                    <p className="text-muted-foreground text-sm mt-1">{formatFileSize(files[0].size)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-foreground font-medium">{files.length} files selected</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))} total
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </button>
      </div>
    );
  }
);

InputFile.displayName = 'InputFile';
