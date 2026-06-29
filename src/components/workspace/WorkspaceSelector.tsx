'use client';

/**
 * WorkspaceSelector Component
 *
 * Dropdown selector for workspaces.
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const { workspaces, selectedWorkspace, selectWorkspace } = useWorkspace();
 *
 *   return (
 *     <WorkspaceSelector
 *       workspaces={workspaces}
 *       selected={selectedWorkspace}
 *       onSelect={selectWorkspace}
 *       onCreateNew={() => setShowCreateModal(true)}
 *     />
 *   );
 * }
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import type { WorkspaceInfo } from '../../types';

export interface WorkspaceSelectorProps {
  /** List of workspaces */
  workspaces: WorkspaceInfo[];
  /** Currently selected workspace */
  selected: WorkspaceInfo | null;
  /** Callback when workspace is selected */
  onSelect: (workspace: WorkspaceInfo) => void;
  /** Callback to create new workspace */
  onCreateNew?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Custom className */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Workspace selector dropdown
 */
export function WorkspaceSelector({
  workspaces,
  selected,
  onSelect,
  onCreateNew,
  isLoading = false,
  className = '',
  placeholder = 'Select workspace',
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (workspace: WorkspaceInfo) => {
    onSelect(workspace);
    setIsOpen(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flowstack-workspace-selector ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flowstack-workspace-trigger"
      >
        <span className="flowstack-workspace-value">
          {selected?.name || placeholder}
        </span>
        <svg
          className={`flowstack-workspace-chevron ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="flowstack-workspace-dropdown">
          {workspaces.length === 0 ? (
            <div className="flowstack-workspace-empty">
              No workspaces found
            </div>
          ) : (
            <ul className="flowstack-workspace-list">
              {workspaces.map(workspace => (
                <li key={workspace.workspaceId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(workspace)}
                    className={`flowstack-workspace-item ${
                      selected?.workspaceId === workspace.workspaceId ? 'selected' : ''
                    }`}
                  >
                    <span className="flowstack-workspace-name">
                      {workspace.name}
                    </span>
                    <span className="flowstack-workspace-meta">
                      {workspace.datasetCount} datasets
                      {workspace.lastAccessed && ` • ${formatDate(workspace.lastAccessed)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNew();
              }}
              className="flowstack-workspace-create"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Create new workspace
            </button>
          )}
        </div>
      )}

      <style>{`
        .flowstack-workspace-selector {
          position: relative;
          width: 100%;
        }
        .flowstack-workspace-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .flowstack-workspace-trigger:hover:not(:disabled) {
          border-color: #9ca3af;
        }
        .flowstack-workspace-trigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .flowstack-workspace-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .flowstack-workspace-chevron {
          flex-shrink: 0;
          transition: transform 0.15s;
        }
        .flowstack-workspace-chevron.open {
          transform: rotate(180deg);
        }
        .flowstack-workspace-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 50;
          max-height: 300px;
          overflow-y: auto;
        }
        .flowstack-workspace-empty {
          padding: 1rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .flowstack-workspace-list {
          list-style: none;
          margin: 0;
          padding: 0.25rem 0;
        }
        .flowstack-workspace-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-workspace-item:hover {
          background: #f3f4f6;
        }
        .flowstack-workspace-item.selected {
          background: #eff6ff;
        }
        .flowstack-workspace-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }
        .flowstack-workspace-meta {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.125rem;
        }
        .flowstack-workspace-create {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: none;
          border: none;
          border-top: 1px solid #e5e7eb;
          font-size: 0.875rem;
          color: #3b82f6;
          cursor: pointer;
          transition: background 0.15s;
        }
        .flowstack-workspace-create:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
