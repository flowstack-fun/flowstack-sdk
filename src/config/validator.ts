/**
 * Configuration Validator
 *
 * Validates FlowstackConfig on startup and provides helpful error messages.
 */

import type { FlowstackConfig } from '../types';
import { FlowstackError, ErrorCodes } from '../errors';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate the SDK configuration
 *
 * @param config - FlowstackConfig to validate
 * @returns ValidationResult with errors and warnings
 *
 * @example
 * ```ts
 * const result = validateConfig(config);
 * if (!result.valid) {
 *   console.error('Config errors:', result.errors);
 * }
 * result.warnings.forEach(w => console.warn(w));
 * ```
 */
export function validateConfig(config: FlowstackConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.jwtSecret) {
    errors.push(
      'Missing required: jwtSecret. This is needed to verify session tokens. ' +
        'Get your JWT secret from your dashboard or set via FLOWSTACK_JWT_SECRET env var.'
    );
  } else if (config.jwtSecret.length < 32) {
    warnings.push(
      'jwtSecret is shorter than 32 characters. Consider using a longer secret for security.'
    );
  }

  if (!config.passwordSecret) {
    errors.push(
      'Missing required: passwordSecret. This is needed for secure password hashing. ' +
        'Generate a unique secret or set via FLOWSTACK_PASSWORD_SECRET env var.'
    );
  } else if (config.passwordSecret.length < 32) {
    warnings.push(
      'passwordSecret is shorter than 32 characters. Consider using a longer secret for security.'
    );
  }

  // tenantId is optional: for authenticated calls the backend derives it from the
  // JWT/API key (the X-Tenant-ID header is ignored), so most apps never set it.
  // It is only required for anonymous access (usePublicCollection), where there is
  // no token — usePublicCollection raises a clear error if it's missing.
  if (!config.tenantId) {
    warnings.push(
      'No tenantId set. Fine for authenticated apps (tenant comes from the JWT). ' +
        'Required only if you use usePublicCollection (anonymous access).'
    );
  }

  if (!config.baseUrl) {
    warnings.push('No baseUrl provided. Using default Flowstack API URL.');
  }

  // Auth configuration
  if (config.auth) {
    if (config.auth.providers.includes('google')) {
      if (!config.auth.googleClientId) {
        errors.push(
          'Google OAuth is enabled but googleClientId is missing. ' +
            'Get your client ID from the Google Cloud Console.'
        );
      }
    }

    if (config.auth.passwordMinLength && config.auth.passwordMinLength < 8) {
      warnings.push(
        'passwordMinLength is less than 8. Consider requiring stronger passwords.'
      );
    }
  }

  // Redis configuration
  if (config.redis) {
    if (!config.redis.url) {
      errors.push('Redis config provided but url is missing.');
    }
    if (!config.redis.token) {
      errors.push('Redis config provided but token is missing.');
    }
  }

  // Database configuration
  if (config.database) {
    if (!config.database.supabaseUrl) {
      errors.push('Database config provided but supabaseUrl is missing.');
    }
    if (!config.database.supabaseKey) {
      errors.push('Database config provided but supabaseKey is missing.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate config and throw FlowstackError if invalid
 *
 * @param config - FlowstackConfig to validate
 * @throws FlowstackError if configuration is invalid
 */
export function validateConfigOrThrow(config: FlowstackConfig): void {
  const result = validateConfig(config);

  if (!result.valid) {
    throw new FlowstackError(ErrorCodes.CONFIG_INVALID, result.errors.join('\n'), {
      userMessage: 'SDK configuration is invalid. Check the console for details.',
      details: { errors: result.errors, warnings: result.warnings },
    });
  }

  // Log warnings
  result.warnings.forEach((warning) => {
    console.warn('[Flowstack]', warning);
  });
}

/**
 * Check if config is for development/testing (relaxed validation)
 */
export function isDevelopmentConfig(config: FlowstackConfig): boolean {
  return (
    config.mode === 'development' ||
    config.mode === 'mock' ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
  );
}

/**
 * Get a summary of the config for debugging
 */
export function getConfigSummary(config: FlowstackConfig): Record<string, unknown> {
  return {
    mode: config.mode || 'production',
    hasJwtSecret: !!config.jwtSecret,
    hasPasswordSecret: !!config.passwordSecret,
    tenantId: config.tenantId || '(from token)',
    baseUrl: config.baseUrl || '(default)',
    authProviders: config.auth?.providers || ['email'],
    hasRedis: !!config.redis,
    hasDatabase: !!config.database,
    storage: config.storage || 'local',
  };
}
