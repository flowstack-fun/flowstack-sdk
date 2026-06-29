'use client';

/**
 * CreateWorkspaceModal Component
 *
 * Modal dialog for creating a new workspace.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [showModal, setShowModal] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setShowModal(true)}>New Workspace</button>
 *       <CreateWorkspaceModal
 *         isOpen={showModal}
 *         onClose={() => setShowModal(false)}
 *         onCreated={(ws) => console.log('Created:', ws.name)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import type { WorkspaceInfo } from '../../types';

export interface CreateWorkspaceModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Callback after workspace is created */
  onCreated?: (workspace: WorkspaceInfo) => void;
  /** Custom className */
  className?: string;
}

/**
 * Create workspace modal
 */
export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
  className = '',
}: CreateWorkspaceModalProps) {
  const { createWorkspace, isLoading, error: hookError } = useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      const workspace = await createWorkspace(name.trim(), description.trim() || undefined);
      if (workspace) {
        onCreated?.(workspace);
        onClose();
      } else {
        setError(hookError || 'Failed to create workspace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    }
  };

  if (!isOpen) return null;

  const displayError = error || hookError;

  return (
    <div className={`flowstack-modal-overlay ${className}`} onClick={onClose}>
      <div
        className="flowstack-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flowstack-modal-title"
      >
        <div className="flowstack-modal-header">
          <h2 id="flowstack-modal-title">Create Workspace</h2>
          <button
            type="button"
            onClick={onClose}
            className="flowstack-modal-close"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {displayError && (
            <div className="flowstack-modal-error" role="alert">
              {displayError}
            </div>
          )}

          <div className="flowstack-modal-field">
            <label htmlFor="flowstack-ws-name">Name *</label>
            <input
              ref={inputRef}
              id="flowstack-ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flowstack-modal-field">
            <label htmlFor="flowstack-ws-desc">Description</label>
            <textarea
              id="flowstack-ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="flowstack-modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flowstack-modal-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flowstack-modal-submit"
            >
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .flowstack-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .flowstack-modal-content {
          background: white;
          border-radius: 0.5rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .flowstack-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .flowstack-modal-header h2 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }
        .flowstack-modal-close {
          padding: 0.25rem;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: color 0.15s;
        }
        .flowstack-modal-close:hover {
          color: #111827;
        }
        .flowstack-modal-content form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .flowstack-modal-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .flowstack-modal-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .flowstack-modal-field label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .flowstack-modal-field input,
        .flowstack-modal-field textarea {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          resize: vertical;
        }
        .flowstack-modal-field input:focus,
        .flowstack-modal-field textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .flowstack-modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .flowstack-modal-cancel {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-modal-cancel:hover:not(:disabled) {
          background: #f3f4f6;
        }
        .flowstack-modal-submit {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-modal-submit:hover:not(:disabled) {
          background: #2563eb;
        }
        .flowstack-modal-submit:disabled,
        .flowstack-modal-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
