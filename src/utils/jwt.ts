/**
 * JWT utilities for token creation and verification
 */

import jwt from 'jsonwebtoken';

export interface JWTPayload {
  user_id?: string;
  tenant_id?: string;
  email?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface ResolvedCredentials {
  apiKey: string;
  tenantId: string;
  userId?: string;
  email?: string;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @param secret - JWT secret for verification
 * @returns Decoded payload or null if verification fails
 */
export function verifyJWT(token: string, secret: string): JWTPayload | null {
  if (!secret) {
    console.error('[JWT] CRITICAL: JWT secret not provided!');
    return null;
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256', 'HS384', 'HS512'],
    }) as JWTPayload;

    // Double-check expiry (jwt.verify does this, but defense in depth)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.warn('[JWT] Token expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[JWT] Verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Sign a JWT token
 * @param payload - Data to include in token
 * @param secret - JWT secret for signing
 * @param expiresIn - Token expiration (default: '1h')
 * @returns Signed JWT token string
 */
export function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string = '1h'
): string {
  if (!secret) {
    throw new Error('JWT secret is required');
  }

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Decode a JWT without verification (for reading claims)
 * WARNING: Only use when you've already verified the token elsewhere
 * @param token - JWT token string
 * @returns Decoded payload or null
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as JWTPayload | null;
  } catch {
    return null;
  }
}

/**
 * Extract user ID from a JWT token or API key
 * @param apiKey - JWT token or API key
 * @returns User ID string or undefined
 */
export function extractUserId(apiKey: string): string | undefined {
  if (!apiKey) return undefined;

  // Try to decode as JWT
  if (apiKey.includes('.')) {
    const decoded = decodeJWT(apiKey);
    if (decoded?.user_id) {
      return String(decoded.user_id);
    }
  }

  // Legacy API key format
  if (apiKey.startsWith('sage_t_')) {
    return apiKey.substring(7, 23);
  } else if (apiKey.startsWith('sage_')) {
    return apiKey.substring(5, 21);
  }

  // Fallback: use first 16 chars
  return apiKey.substring(0, 16);
}

/**
 * Resolve credentials from a token
 * @param apiKey - JWT token or API key
 * @param jwtSecret - JWT secret for verification
 * @param sharedTenantId - Default tenant ID
 * @returns Resolved credentials or null
 */
export function resolveCredentials(
  apiKey: string | null,
  jwtSecret: string,
  sharedTenantId: string
): ResolvedCredentials | null {
  if (!apiKey) {
    return null;
  }

  // Verify JWT and extract user_id
  const payload = verifyJWT(apiKey, jwtSecret);

  if (!payload) {
    console.error('[JWT] Token verification failed - invalid or expired');
    return null;
  }

  return {
    apiKey,
    tenantId: sharedTenantId,
    userId: payload.user_id ? String(payload.user_id) : undefined,
    email: payload.email ? String(payload.email) : undefined,
  };
}

/**
 * Check if a token is expired
 * @param token - JWT token string
 * @returns true if expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get time until token expires
 * @param token - JWT token string
 * @returns Milliseconds until expiry, or 0 if expired
 */
export function getTokenTTL(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return 0;
  const ttl = decoded.exp * 1000 - Date.now();
  return Math.max(0, ttl);
}
