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
  /** Current selected file (controlled) */
  value?: File | null;
  /** Callback when file is selected */
  onChange?: (file: File | null) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Placeholder text when no file selected */
  placeholder?: string;
}

export interface InputFileHandle {
  reset: () => void;
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
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onChange?.(null);
      },
    }));

    const handleFileSelect = (file: File) => {
      onChange?.(file);
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
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
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
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
          disabled={disabled}
        />

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleZoneClick}
          className={cn(
            'border-2 border-dashed rounded-xl px-12 py-8 text-center transition-colors duration-200 h-[180px] flex items-center justify-center',
            !value && !isDragging && 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer',
            value && !isDragging && 'border-primary/30 bg-primary/5 cursor-pointer',
            isDragging && 'border-primary bg-primary/10 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
          )}
        >
          {/* Idle - No file */}
          {!value && !isDragging && (
            <div className="space-y-4">
              <div className="icon-container mx-auto w-fit">
                <FileUp className="h-6 w-6" />
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
                <FileUp className="h-6 w-6" />
              </div>
              <p className="text-primary font-medium">Drop your file here</p>
            </div>
          )}

          {/* File selected */}
          {value && !isDragging && (
            <div className="space-y-4">
              <div className="icon-container mx-auto w-fit">
                <FileIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-foreground font-medium">{value.name}</p>
                <p className="text-muted-foreground text-sm mt-1">{formatFileSize(value.size)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

InputFile.displayName = 'InputFile';
