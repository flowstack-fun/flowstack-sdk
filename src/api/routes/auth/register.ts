/**
 * Register Route Generator
 *
 * Creates a Next.js API route handler for user registration.
 *
 * @example
 * ```ts
 * // app/api/auth/register/route.ts
 * import { createRegisterRoute } from 'flowstack-sdk/api/routes';
 *
 * export const POST = createRegisterRoute({
 *   jwtSecret: process.env.JWT_SECRET!,
 *   passwordSecret: process.env.PASSWORD_SECRET!,
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '../../../utils/crypto';
import { signJWT } from '../../../utils/jwt';

export interface RegisterRouteConfig {
  /** JWT secret for token signing */
  jwtSecret: string;
  /** Token expiration in seconds (default: 86400 = 24 hours) */
  tokenExpiry?: number;
  /** Minimum password length (default: 8) */
  minPasswordLength?: number;
  /** Tenant ID (default: shared tenant) */
  tenantId?: string;
  /** Sage API base URL */
  baseUrl?: string;
  /** Custom user creation function */
  createUser?: (data: {
    email: string;
    passwordHash: string;
  }) => Promise<{ id: string; email: string }>;
  /** Check if email already exists */
  userExists?: (email: string) => Promise<boolean>;
}

/**
 * Create a registration route handler
 */
export function createRegisterRoute(config: RegisterRouteConfig) {
  const {
    jwtSecret,
    tokenExpiry = 86400,
    minPasswordLength = 8,
    tenantId = 't_6fe54402be43',
    baseUrl = 'https://sage-api.flowstack.fun',
    createUser,
    userExists,
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

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Validate password length
      if (password.length < minPasswordLength) {
        return NextResponse.json(
          { success: false, error: `Password must be at least ${minPasswordLength} characters` },
          { status: 400 }
        );
      }

      // If custom user creation is provided, use it
      if (createUser) {
        // Check if user exists
        if (userExists) {
          const exists = await userExists(email);
          if (exists) {
            return NextResponse.json(
              { success: false, error: 'Email already registered' },
              { status: 409 }
            );
          }
        }

        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const user = await createUser({ email, passwordHash });

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
      const response = await fetch(`${baseUrl}/auth/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || data.detail || 'Registration failed' },
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
        message: 'Registration successful',
      });
    } catch (error) {
      console.error('[RegisterRoute] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
