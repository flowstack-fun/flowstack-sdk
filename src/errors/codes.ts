/**
 * Flowstack SDK Error Codes
 *
 * Standardized error codes for programmatic error handling.
 */

export const ErrorCodes = {
  // Configuration errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING_JWT_SECRET: 'CONFIG_MISSING_JWT_SECRET',
  CONFIG_MISSING_PASSWORD_SECRET: 'CONFIG_MISSING_PASSWORD_SECRET',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',

  // Authentication errors
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHENTICATION_EXPIRED: 'AUTHENTICATION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Workspace errors
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  WORKSPACE_REQUIRED: 'WORKSPACE_REQUIRED',
  WORKSPACE_CREATE_FAILED: 'WORKSPACE_CREATE_FAILED',

  // Dataset errors
  DATASET_NOT_FOUND: 'DATASET_NOT_FOUND',
  DATASET_UPLOAD_FAILED: 'DATASET_UPLOAD_FAILED',
  DATASET_DOWNLOAD_FAILED: 'DATASET_DOWNLOAD_FAILED',
  DATASET_DELETE_FAILED: 'DATASET_DELETE_FAILED',
  DATASET_TOO_LARGE: 'DATASET_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // Query/Agent errors
  QUERY_FAILED: 'QUERY_FAILED',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  QUERY_CANCELLED: 'QUERY_CANCELLED',
  AGENT_ERROR: 'AGENT_ERROR',
  STREAMING_ERROR: 'STREAMING_ERROR',

  // Data source errors
  DATA_SOURCE_NOT_FOUND: 'DATA_SOURCE_NOT_FOUND',
  DATA_SOURCE_CONNECTION_FAILED: 'DATA_SOURCE_CONNECTION_FAILED',
  DATA_SOURCE_AUTH_FAILED: 'DATA_SOURCE_AUTH_FAILED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED',

  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * User-friendly messages for each error code
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.CONFIG_INVALID]: 'Invalid SDK configuration',
  [ErrorCodes.CONFIG_MISSING_JWT_SECRET]: 'JWT secret is required in configuration',
  [ErrorCodes.CONFIG_MISSING_PASSWORD_SECRET]: 'Password secret is required in configuration',

  [ErrorCodes.NETWORK_ERROR]: 'Unable to connect to the server',
  [ErrorCodes.NETWORK_TIMEOUT]: 'Request timed out. Please try again',
  [ErrorCodes.NETWORK_OFFLINE]: 'No internet connection',

  [ErrorCodes.AUTHENTICATION_FAILED]: 'Authentication failed',
  [ErrorCodes.AUTHENTICATION_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCodes.ACCOUNT_NOT_ACTIVE]: 'Your account is not active. Please check your email for activation instructions',
  [ErrorCodes.ACCOUNT_LOCKED]: 'Your account has been locked. Please contact support',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Please verify your email address to continue',

  [ErrorCodes.UNAUTHORIZED]: 'You are not authorized to perform this action',
  [ErrorCodes.FORBIDDEN]: 'Access denied',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to access this resource',

  [ErrorCodes.WORKSPACE_NOT_FOUND]: 'Workspace not found',
  [ErrorCodes.WORKSPACE_REQUIRED]: 'Please select a workspace to continue',
  [ErrorCodes.WORKSPACE_CREATE_FAILED]: 'Failed to create workspace',

  [ErrorCodes.DATASET_NOT_FOUND]: 'Dataset not found',
  [ErrorCodes.DATASET_UPLOAD_FAILED]: 'Failed to upload dataset',
  [ErrorCodes.DATASET_DOWNLOAD_FAILED]: 'Failed to download dataset',
  [ErrorCodes.DATASET_DELETE_FAILED]: 'Failed to delete dataset',
  [ErrorCodes.DATASET_TOO_LARGE]: 'Dataset exceeds maximum size limit',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type',

  [ErrorCodes.QUERY_FAILED]: 'Query failed',
  [ErrorCodes.QUERY_TIMEOUT]: 'Query timed out. Please try a simpler request',
  [ErrorCodes.QUERY_CANCELLED]: 'Query was cancelled',
  [ErrorCodes.AGENT_ERROR]: 'AI agent encountered an error',
  [ErrorCodes.STREAMING_ERROR]: 'Error in streaming response',

  [ErrorCodes.DATA_SOURCE_NOT_FOUND]: 'Data source not found',
  [ErrorCodes.DATA_SOURCE_CONNECTION_FAILED]: 'Failed to connect to data source',
  [ErrorCodes.DATA_SOURCE_AUTH_FAILED]: 'Data source authentication failed',

  [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please slow down',
  [ErrorCodes.CREDITS_EXHAUSTED]: 'You have run out of credits',

  [ErrorCodes.SERVER_ERROR]: 'An unexpected server error occurred',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
  [ErrorCodes.MAINTENANCE_MODE]: 'Service is under maintenance',

  [ErrorCodes.VALIDATION_ERROR]: 'Validation error',
  [ErrorCodes.INVALID_EMAIL]: 'Please enter a valid email address',
  [ErrorCodes.PASSWORD_TOO_SHORT]: 'Password is too short',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Required field is missing',

  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred',
};

/**
 * Recovery actions for each error code
 */
export const RecoveryActions: Partial<Record<ErrorCode, string>> = {
  [ErrorCodes.NETWORK_ERROR]: 'Check your internet connection and try again',
  [ErrorCodes.NETWORK_OFFLINE]: 'Connect to the internet and try again',
  [ErrorCodes.AUTHENTICATION_EXPIRED]: 'Log in again to continue',
  [ErrorCodes.ACCOUNT_NOT_ACTIVE]: 'Check your email for the activation link',
  [ErrorCodes.EMAIL_NOT_VERIFIED]: 'Check your email for the verification link',
  [ErrorCodes.WORKSPACE_REQUIRED]: 'Select or create a workspace',
  [ErrorCodes.RATE_LIMITED]: 'Wait a moment and try again',
  [ErrorCodes.CREDITS_EXHAUSTED]: 'Upgrade your plan or wait for credits to reset',
};
