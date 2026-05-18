/**
 * validation.ts — Input validation helpers for the backend.
 */

/**
 * Normalises and validates an ICAO airport code.
 *
 * Rules:
 * - Trim whitespace
 * - Convert to uppercase
 * - Must be exactly 4 alphanumeric characters (A-Z, 0-9)
 *
 * Returns the normalised code if valid, or null if invalid.
 */
export function normalizeAndValidateIcao(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return /^[A-Z0-9]{4}$/.test(code) ? code : null
}
