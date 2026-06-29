'use client';

/**
 * DatasetUploader Component
 *
 * Drag-and-drop file uploader for datasets.
 *
 * @example
 * ```tsx
 * function DataPage() {
 *   const { uploadDataset } = useDatasets();
 *
 *   return (
 *     <DatasetUploader
 *       onUpload={uploadDataset}
 *       onUploadComplete={(dataset) => console.log('Uploaded:', dataset.name)}
 *     />
 *   );
 * }
 * ```
 */

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import type { DatasetInfo } from '../../types';

export interface DatasetUploaderProps {
  /** Upload handler */
  onUpload: (file: File, name?: string) => Promise<DatasetInfo | null>;
  /** Callback after successful upload */
  onUploadComplete?: (dataset: DatasetInfo) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Accepted file types */
  accept?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
  /** Custom className */
  className?: string;
}

/**
 * Dataset uploader component
 */
export function DatasetUploader({
  onUpload,
  onUploadComplete,
  onError,
  accept = '.csv,.xlsx,.xls,.json,.parquet',
  maxSizeMB = 100,
  className = '',
}: DatasetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      const errMsg = `File too large. Max size is ${maxSizeMB}MB`;
      setError(errMsg);
      onError?.(errMsg);
      return;
    }

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    const acceptedExts = accept.split(',').map(a => a.replace('.', '').trim());
    if (ext && !acceptedExts.includes(ext)) {
      const errMsg = `Invalid file type. Accepted: ${accept}`;
      setError(errMsg);
      onError?.(errMsg);
      return;
    }

    setIsUploading(true);
    setProgress(0);

    // Simulate progress (actual progress would require XHR)
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const dataset = await onUpload(file);
      clearInterval(progressInterval);
      setProgress(100);

      if (dataset) {
        onUploadComplete?.(dataset);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      clearInterval(progressInterval);
      const errMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errMsg);
      onError?.(errMsg);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`flowstack-uploader ${className}`}>
      <div
        className={`flowstack-uploader-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={isUploading}
          hidden
        />

        {isUploading ? (
          <div className="flowstack-uploader-progress">
            <div className="flowstack-uploader-spinner" />
            <p>Uploading... {progress}%</p>
            <div className="flowstack-uploader-bar">
              <div
                className="flowstack-uploader-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg
              className="flowstack-uploader-icon"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
            >
              <path
                d="M8 32L8 36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32M32 16L24 8M24 8L16 16M24 8V32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="flowstack-uploader-text">
              <strong>Click to upload</strong> or drag and drop
            </p>
            <p className="flowstack-uploader-hint">
              CSV, Excel, JSON, or Parquet (max {maxSizeMB}MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flowstack-uploader-error" role="alert">
          {error}
        </div>
      )}

      <style>{`
        .flowstack-uploader {
          width: 100%;
        }
        .flowstack-uploader-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          background: #fafafa;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .flowstack-uploader-zone:hover,
        .flowstack-uploader-zone.dragging {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .flowstack-uploader-zone.uploading {
          cursor: default;
          border-style: solid;
        }
        .flowstack-uploader-icon {
          color: #9ca3af;
          margin-bottom: 1rem;
        }
        .flowstack-uploader-text {
          font-size: 0.9375rem;
          color: #374151;
          margin: 0 0 0.25rem;
        }
        .flowstack-uploader-hint {
          font-size: 0.8125rem;
          color: #6b7280;
          margin: 0;
        }
        .flowstack-uploader-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .flowstack-uploader-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: flowstack-spin 0.8s linear infinite;
        }
        @keyframes flowstack-spin {
          to { transform: rotate(360deg); }
        }
        .flowstack-uploader-progress p {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
        }
        .flowstack-uploader-bar {
          width: 200px;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }
        .flowstack-uploader-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.2s;
        }
        .flowstack-uploader-error {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
