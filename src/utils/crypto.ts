/**
 * Cryptographic utilities for password hashing and verification
 * Uses scrypt for secure password hashing
 */

import crypto from 'crypto';

/**
 * Hash a password using scrypt
 * @param password - Plain text password
 * @returns Promise resolving to hash string in format "salt:derivedKey"
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a hash using timing-safe comparison
 * @param password - Plain text password to verify
 * @param hash - Hash string in format "salt:derivedKey"
 * @returns Promise resolving to true if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    if (!salt || !key) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);

      // Use timing-safe comparison to prevent timing attacks
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        const isValid = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(isValid);
      } catch {
        // If buffers are different lengths, timingSafeEqual throws
        resolve(false);
      }
    });
  });
}

/**
 * Generate a deterministic Sage password from user credentials
 * This is used to authenticate with the Sage backend
 * @param email - User's email (normalized)
 * @param passwordSecret - Application password secret
 * @param passwordHash - User's password hash from database
 * @returns Sage-compatible password string
 */
export function generateSagePassword(
  email: string,
  passwordSecret: string,
  passwordHash: string
): string {
  return crypto.createHash('sha256')
    .update(email + passwordSecret + passwordHash)
    .digest('base64')
    .substring(0, 32) + 'Aa1!'; // Append to satisfy password requirements
}

/**
 * Generate a secure random token
 * @param length - Number of bytes (default: 32)
 * @returns Hex-encoded random string
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a SHA256 hash of data
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Redact an email for logging (show first 2 chars and domain)
 * @param email - Email to redact
 * @returns Redacted email string
 */
export function redactEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const redacted = local.length > 2
    ? local.substring(0, 2) + '***'
    : '***';
  return `${redacted}@${domain}`;
}
