'use client';

/**
 * DashboardLayout Component
 *
 * A responsive dashboard layout with sidebar, header, and main content area.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <DashboardLayout
 *       sidebar={<Sidebar />}
 *       header={<Header />}
 *     >
 *       <MainContent />
 *     </DashboardLayout>
 *   );
 * }
 * ```
 */

import React, { ReactNode, useState } from 'react';
import { useFlowstack } from '../../context/FlowstackProvider';

export interface DashboardLayoutProps {
  /** Main content */
  children: ReactNode;
  /** Sidebar content */
  sidebar?: ReactNode;
  /** Header content */
  header?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Show workspace selector in header */
  showWorkspaceSelector?: boolean;
  /** Show user menu in header */
  showUserMenu?: boolean;
  /** Sidebar collapsed by default */
  sidebarCollapsed?: boolean;
  /** Sidebar width in pixels */
  sidebarWidth?: number;
  /** Header height in pixels */
  headerHeight?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Dashboard layout component with responsive sidebar
 */
export function DashboardLayout({
  children,
  sidebar,
  header,
  footer,
  showWorkspaceSelector = true,
  showUserMenu = true,
  sidebarCollapsed = false,
  sidebarWidth = 260,
  headerHeight = 64,
  className = '',
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(sidebarCollapsed);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { credentials, selectedWorkspace, workspaces, logout } = useFlowstack();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className={`flowstack-dashboard ${className}`}>
      {/* Sidebar */}
      {sidebar && (
        <>
          <aside
            className={`flowstack-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}
            style={{ width: isCollapsed ? 80 : sidebarWidth }}
          >
            <div className="flowstack-sidebar-content">{sidebar}</div>
            <button
              className="flowstack-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? '>' : '<'}
            </button>
          </aside>
          {isMobileMenuOpen && (
            <div
              className="flowstack-sidebar-overlay"
              onClick={toggleMobileMenu}
            />
          )}
        </>
      )}

      {/* Main content area */}
      <div
        className="flowstack-main-wrapper"
        style={{
          marginLeft: sidebar ? (isCollapsed ? 80 : sidebarWidth) : 0,
        }}
      >
        {/* Header */}
        <header
          className="flowstack-header"
          style={{ height: headerHeight }}
        >
          {sidebar && (
            <button
              className="flowstack-mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          )}

          {header || (
            <div className="flowstack-header-default">
              {showWorkspaceSelector && selectedWorkspace && (
                <div className="flowstack-workspace-badge">
                  <span className="flowstack-workspace-label">Workspace:</span>
                  <span className="flowstack-workspace-name">
                    {selectedWorkspace.name}
                  </span>
                </div>
              )}

              <div className="flowstack-header-spacer" />

              {showUserMenu && credentials && (
                <div className="flowstack-user-menu">
                  <span className="flowstack-user-email">
                    {credentials.email}
                  </span>
                  <button
                    className="flowstack-logout-btn"
                    onClick={() => logout()}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="flowstack-main-content">
          {children}
        </main>

        {/* Footer */}
        {footer && <footer className="flowstack-footer">{footer}</footer>}
      </div>

      <style>{`
        .flowstack-dashboard {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .flowstack-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #1a1a2e;
          color: white;
          transition: width 0.2s ease, transform 0.2s ease;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .flowstack-sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .flowstack-sidebar-toggle {
          position: absolute;
          right: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1a1a2e;
          border: 2px solid #e5e5e5;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .flowstack-sidebar-toggle:hover {
          background: #2a2a4e;
        }

        .flowstack-sidebar-overlay {
          display: none;
        }

        .flowstack-main-wrapper {
          min-height: 100vh;
          transition: margin-left 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .flowstack-header {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          padding: 0 24px;
          z-index: 100;
        }

        .flowstack-mobile-menu-toggle {
          display: none;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          margin-right: 16px;
        }

        .flowstack-mobile-menu-toggle span {
          display: block;
          width: 20px;
          height: 2px;
          background: #333;
        }

        .flowstack-header-default {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .flowstack-workspace-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0f0f0;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .flowstack-workspace-label {
          color: #666;
        }

        .flowstack-workspace-name {
          font-weight: 500;
          color: #1a1a1a;
        }

        .flowstack-header-spacer {
          flex: 1;
        }

        .flowstack-user-menu {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .flowstack-user-email {
          font-size: 14px;
          color: #666;
        }

        .flowstack-logout-btn {
          background: none;
          border: 1px solid #ddd;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .flowstack-logout-btn:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .flowstack-main-content {
          flex: 1;
          padding: 24px;
        }

        .flowstack-footer {
          background: white;
          border-top: 1px solid #e5e5e5;
          padding: 16px 24px;
        }

        @media (max-width: 768px) {
          .flowstack-sidebar {
            transform: translateX(-100%);
            width: 260px !important;
          }

          .flowstack-sidebar.mobile-open {
            transform: translateX(0);
          }

          .flowstack-sidebar-toggle {
            display: none;
          }

          .flowstack-sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
          }

          .flowstack-main-wrapper {
            margin-left: 0 !important;
          }

          .flowstack-mobile-menu-toggle {
            display: flex;
          }

          .flowstack-main-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
