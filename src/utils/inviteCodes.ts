/**
 * Utilities for generating and validating unique personal invitation codes.
 * Format: 6 uppercase alphanumeric characters.
 * Excludes ambiguous characters (0, O, 1, I) to avoid confusion when sharing.
 */

// 30 unambiguous characters
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateInviteCode(): string {
  let code = '';
  // Use crypto API for secure randomness
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    code += CHARSET[array[i] % CHARSET.length];
  }
  return code;
}

export function isValidInviteCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const cleaned = code.trim().toUpperCase();
  if (cleaned.length !== 6) return false;
  // Allow all standard uppercase letters and digits 0-9 (even if 0/1 entered by user, normalize)
  return /^[A-Z0-9]{6}$/.test(cleaned);
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
