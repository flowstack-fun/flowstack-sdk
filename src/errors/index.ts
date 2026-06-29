/**
 * Flowstack SDK Error Handling
 *
 * Provides structured error handling with error codes, user-friendly messages,
 * and recovery actions.
 *
 * @example
 * ```tsx
 * import { FlowstackError, ErrorCodes } from 'flowstack-sdk';
 *
 * try {
 *   await login(email, password);
 * } catch (error) {
 *   if (error instanceof FlowstackError) {
 *     if (error.code === ErrorCodes.ACCOUNT_NOT_ACTIVE) {
 *       showActivationPrompt();
 *     }
 *     showError(error.userMessage);
 *   }
 * }
 * ```
 */

import { ErrorCode, ErrorCodes, ErrorMessages, RecoveryActions } from './codes';

export { ErrorCodes, ErrorMessages, RecoveryActions } from './codes';
export type { ErrorCode } from './codes';

export interface FlowstackErrorOptions {
  /** User-friendly error message */
  userMessage?: string;
  /** Suggested recovery action */
  recoveryAction?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** HTTP status code if from API */
  status?: number;
  /** Original error that caused this error */
  cause?: Error;
}

/**
 * Structured error class for Flowstack SDK
 *
 * Provides:
 * - Error code for programmatic handling
 * - User-friendly message for display
 * - Recovery action suggestions
 * - Additional details for debugging
 */
export class FlowstackError extends Error {
  /** Error code for programmatic handling */
  readonly code: ErrorCode;

  /** User-friendly message safe to display */
  readonly userMessage: string;

  /** Suggested action to recover from the error */
  readonly recoveryAction?: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** HTTP status code if from API response */
  readonly status?: number;

  /** Original error that caused this error */
  readonly originalCause?: Error;

  constructor(code: ErrorCode, message?: string, options?: FlowstackErrorOptions) {
    const finalMessage = message || ErrorMessages[code] || 'An error occurred';
    super(finalMessage);

    this.name = 'FlowstackError';
    this.code = code;
    this.userMessage = options?.userMessage || ErrorMessages[code] || finalMessage;
    this.recoveryAction = options?.recoveryAction || RecoveryActions[code];
    this.details = options?.details;
    this.status = options?.status;
    this.originalCause = options?.cause;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, FlowstackError.prototype);
  }

  /**
   * Create a FlowstackError from an API response
   */
  static fromApiError(status: number, body: string | Record<string, unknown>): FlowstackError {
    const parsed = typeof body === 'string' ? tryParseJSON(body) : body;
    const detail = parsed?.detail || parsed?.error || parsed?.message || 'Request failed';

    // Map common API errors to error codes
    const code = mapStatusToErrorCode(status, String(detail));

    return new FlowstackError(code, String(detail), {
      status,
      details: typeof parsed === 'object' && parsed !== null ? parsed : { raw: body },
    });
  }

  /**
   * Create a FlowstackError from a network error
   */
  static fromNetworkError(error: Error): FlowstackError {
    // Check for common network error patterns
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return new FlowstackError(ErrorCodes.NETWORK_ERROR, 'Failed to connect to server', {
        cause: error,
      });
    }

    if (error.message.includes('timeout') || error.name === 'AbortError') {
      return new FlowstackError(ErrorCodes.NETWORK_TIMEOUT, 'Request timed out', {
        cause: error,
      });
    }

    return new FlowstackError(ErrorCodes.NETWORK_ERROR, error.message, {
      cause: error,
    });
  }

  /**
   * Create a FlowstackError from any error
   */
  static from(error: unknown): FlowstackError {
    if (error instanceof FlowstackError) {
      return error;
    }

    if (error instanceof Error) {
      // Check if it's a network error
      if (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED')
      ) {
        return FlowstackError.fromNetworkError(error);
      }

      return new FlowstackError(ErrorCodes.UNKNOWN_ERROR, error.message, {
        cause: error,
      });
    }

    // Handle non-Error values
    const message = typeof error === 'string' ? error : 'An unexpected error occurred';
    return new FlowstackError(ErrorCodes.UNKNOWN_ERROR, message);
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes: ErrorCode[] = [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.NETWORK_TIMEOUT,
      ErrorCodes.SERVER_ERROR,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.RATE_LIMITED,
    ];
    return retryableCodes.includes(this.code);
  }

  /**
   * Check if this error requires re-authentication
   */
  requiresReauth(): boolean {
    const reauthCodes: ErrorCode[] = [
      ErrorCodes.AUTHENTICATION_EXPIRED,
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.INVALID_CREDENTIALS,
    ];
    return reauthCodes.includes(this.code);
  }

  /**
   * Get a serializable representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoveryAction: this.recoveryAction,
      details: this.details,
      status: this.status,
    };
  }
}

/**
 * Helper to try parsing JSON, returning null on failure
 */
function tryParseJSON(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Map HTTP status codes to error codes
 */
function mapStatusToErrorCode(status: number, detail: string): ErrorCode {
  // Check for specific error patterns in the detail
  const lowerDetail = detail.toLowerCase();

  if (lowerDetail.includes('not active') || lowerDetail.includes('account not active')) {
    return ErrorCodes.ACCOUNT_NOT_ACTIVE;
  }
  if (lowerDetail.includes('not verified') || lowerDetail.includes('verify')) {
    return ErrorCodes.EMAIL_NOT_VERIFIED;
  }
  if (lowerDetail.includes('locked')) {
    return ErrorCodes.ACCOUNT_LOCKED;
  }
  if (lowerDetail.includes('rate limit') || lowerDetail.includes('too many')) {
    return ErrorCodes.RATE_LIMITED;
  }
  if (lowerDetail.includes('credit') || lowerDetail.includes('quota')) {
    return ErrorCodes.CREDITS_EXHAUSTED;
  }

  // Map by status code
  switch (status) {
    case 400:
      return ErrorCodes.VALIDATION_ERROR;
    case 401:
      return ErrorCodes.AUTHENTICATION_FAILED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.WORKSPACE_NOT_FOUND;
    case 408:
      return ErrorCodes.NETWORK_TIMEOUT;
    case 409:
      return ErrorCodes.VALIDATION_ERROR;
    case 429:
      return ErrorCodes.RATE_LIMITED;
    case 500:
      return ErrorCodes.SERVER_ERROR;
    case 502:
    case 503:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    case 504:
      return ErrorCodes.NETWORK_TIMEOUT;
    default:
      return status >= 500 ? ErrorCodes.SERVER_ERROR : ErrorCodes.UNKNOWN_ERROR;
  }
}

/**
 * Type guard to check if an error is a FlowstackError
 */
export function isFlowstackError(error: unknown): error is FlowstackError {
  return error instanceof FlowstackError;
}

/**
 * Utility to wrap async functions with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const flowstackError = FlowstackError.from(error);
    if (context) {
      flowstackError.details = { ...flowstackError.details, context };
    }
    throw flowstackError;
  }
}
