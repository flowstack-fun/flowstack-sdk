/**
 * Login Route Generator
 *
 * Creates a Next.js API route handler for user login.
 *
 * @example
 * ```ts
 * // app/api/auth/login/route.ts
 * import { createLoginRoute } from 'flowstack-sdk/api/routes';
 *
 * export const POST = createLoginRoute({
 *   jwtSecret: process.env.JWT_SECRET!,
 *   passwordSecret: process.env.PASSWORD_SECRET!,
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '../../../utils/crypto';
import { signJWT } from '../../../utils/jwt';

export interface LoginRouteConfig {
  /** JWT secret for token signing */
  jwtSecret: string;
  /** Token expiration in seconds (default: 86400 = 24 hours) */
  tokenExpiry?: number;
  /** Tenant ID (default: shared tenant) */
  tenantId?: string;
  /** Sage API base URL */
  baseUrl?: string;
  /** Custom user lookup function */
  getUserByEmail?: (email: string) => Promise<{
    id: string;
    email: string;
    passwordHash: string;
  } | null>;
}

/**
 * Create a login route handler
 */
export function createLoginRoute(config: LoginRouteConfig) {
  const {
    jwtSecret,
    tokenExpiry = 86400,
    tenantId = 't_6fe54402be43',
    baseUrl = 'https://sage-api.flowstack.fun',
    getUserByEmail,
  } = config;

  return async function POST(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'Email and password are required' },
          { status: 400 }
        );
      }

      // If custom user lookup is provided, use it
      if (getUserByEmail) {
        const user = await getUserByEmail(email);
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401 }
          );
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401 }
          );
        }

        // Generate JWT (convert tokenExpiry seconds to string format)
        const token = signJWT(
          { user_id: user.id, email: user.email },
          jwtSecret,
          `${tokenExpiry}s`
        );

        const expiresAt = new Date(Date.now() + tokenExpiry * 1000).toISOString();

        return NextResponse.json({
          success: true,
          sessionToken: token,
          userId: user.id,
          email: user.email,
          tenantId,
          expiresAt,
        });
      }

      // Default: proxy to Sage API (raw password — backend handles bcrypt)
      const response = await fetch(`${baseUrl}/auth/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || 'Login failed' },
          { status: response.status }
        );
      }

      // Create JWT with user info (convert tokenExpiry seconds to string format)
      const token = signJWT(
        { user_id: data.user_id, email },
        jwtSecret,
        `${tokenExpiry}s`
      );

      const expiresAt = new Date(Date.now() + tokenExpiry * 1000).toISOString();

      return NextResponse.json({
        success: true,
        sessionToken: token,
        userId: data.user_id,
        email,
        tenantId,
        expiresAt,
      });
    } catch (error) {
      console.error('[LoginRoute] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
