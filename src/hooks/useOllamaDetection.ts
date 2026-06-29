/**
 * useOllamaDetection — Detect a local Ollama instance and list available models.
 *
 * Probes the Ollama API at the given host (default: http://localhost:11434)
 * via GET /api/tags. If Ollama is running and CORS is enabled, returns the
 * list of locally available models.
 *
 * Note: Users must set OLLAMA_ORIGINS=* (or include the Casino origin) when
 * starting Ollama for browser-side detection to work.
 *
 * Usage:
 *   const { available, models, error, detect } = useOllamaDetection();
 */

import { useState, useEffect, useCallback } from 'react';
import type { OllamaStatus, OllamaLocalModel } from '../types';

const DEFAULT_HOST = 'http://localhost:11434';
const DETECTION_TIMEOUT_MS = 3000;

export interface UseOllamaDetectionReturn {
  available: boolean;
  models: OllamaLocalModel[];
  host: string;
  error: string | null;
  isDetecting: boolean;
  detect: (host?: string) => Promise<OllamaStatus>;
}

export function useOllamaDetection(initialHost = DEFAULT_HOST): UseOllamaDetectionReturn {
  const [available, setAvailable] = useState(false);
  const [models, setModels] = useState<OllamaLocalModel[]>([]);
  const [host, setHost] = useState(initialHost);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detect = useCallback(async (targetHost?: string): Promise<OllamaStatus> => {
    const h = targetHost || host;
    setIsDetecting(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DETECTION_TIMEOUT_MS);

      const res = await fetch(`${h}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Ollama returned ${res.status}`);
      }

      const data = await res.json();
      const ollamaModels: OllamaLocalModel[] = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size || 0,
        modified_at: m.modified_at || '',
        digest: m.digest,
      }));

      setAvailable(true);
      setModels(ollamaModels);
      if (targetHost) setHost(targetHost);

      return { available: true, host: h, models: ollamaModels };
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Connection timed out'
        : err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
          ? 'Ollama not reachable. Ensure it is running and OLLAMA_ORIGINS=* is set.'
          : err.message;

      setAvailable(false);
      setModels([]);
      setError(msg);
      return { available: false, host: h, models: [], error: msg };
    } finally {
      setIsDetecting(false);
    }
  }, [host]);

  // Auto-detect on mount
  useEffect(() => {
    detect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { available, models, host, error, isDetecting, detect };
}
