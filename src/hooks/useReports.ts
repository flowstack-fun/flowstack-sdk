'use client';

/**
 * useReports Hook
 *
 * Provides report management functionality.
 *
 * @example
 * ```tsx
 * function ReportsList() {
 *   const { reports, downloadReport, isLoading } = useReports();
 *
 *   const handleDownload = async (report) => {
 *     const blob = await downloadReport(report.url, report.name, report.format);
 *     if (blob) {
 *       const url = URL.createObjectURL(blob);
 *       window.open(url, '_blank');
 *     }
 *   };
 *
 *   return (
 *     <ul>
 *       {reports.map(r => (
 *         <li key={r.id}>
 *           {r.name}
 *           <button onClick={() => handleDownload(r)}>Download</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseReportsReturn, ReportInfo } from '../types';

/**
 * Hook for report operations
 */
export function useReports(): UseReportsReturn {
  const {
    credentials,
    reports,
    refreshReports: contextRefresh,
    isLoadingReports,
    config,
  } = useFlowstack();

  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a report file
   */
  const uploadReport = useCallback(async (
    _file: File,
    _name?: string
  ): Promise<ReportInfo | null> => {
    setError(null);

    // Report upload would go through the same upload endpoint
    // Implementation depends on backend support
    setError('Report upload not implemented');
    return null;
  }, []);

  /**
   * Download a report
   */
  const downloadReport = useCallback(async (
    url: string,
    _name: string,
    _format: string
  ): Promise<Blob | null> => {
    setError(null);

    if (!credentials) {
      setError('Not authenticated');
      return null;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'X-Tenant-ID': credentials.tenantId,
          'X-User-ID': credentials.userId || '',
        },
      });

      if (!response.ok) {
        setError(`Download failed: ${response.statusText}`);
        return null;
      }

      return await response.blob();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      return null;
    }
  }, [credentials]);

  /**
   * Refresh reports list
   */
  const refreshReports = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
    }
  }, [contextRefresh]);

  return {
    reports,
    isLoading: isLoadingReports,
    error,
    uploadReport,
    downloadReport,
    refreshReports,
  };
}
