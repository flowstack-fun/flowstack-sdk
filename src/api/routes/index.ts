/**
 * API Route Generators
 *
 * Factory functions for creating Next.js API route handlers.
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

export { createLoginRoute, createRegisterRoute } from './auth';
export type { LoginRouteConfig, RegisterRouteConfig } from './auth';

// Re-export types for convenience
export type { NextRequest, NextResponse } from 'next/server';
