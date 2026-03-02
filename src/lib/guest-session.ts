/**
 * Guest session ID utility module.
 * Story 8.4, Task 1
 *
 * Manages a UUID-based guest session identifier persisted in localStorage.
 * - The session ID is the SINGLE SOURCE OF TRUTH for guest identity.
 * - Survives browser tab close (localStorage), scoped to one browser/device.
 * - If localStorage is cleared or a different device is used, a new session starts.
 */

const STORAGE_KEY = 'mynewstyle-guest-session-id';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the given string is a valid UUID v4 format.
 */
function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Reads the current guest session ID from localStorage.
 * Returns null if absent or invalid — does NOT generate a new one.
 * Use for read-only checks (e.g., sending headers).
 */
export function getGuestSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored || !isValidUUID(stored)) return null;
  return stored;
}

/**
 * Reads the guest session ID from localStorage.
 * If absent or invalid, generates a new UUID, persists it, and returns it.
 * Idempotent: returns the same value on every call once created.
 *
 * This is the canonical function to obtain the guest session ID.
 */
export function getOrCreateGuestSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering: return a placeholder (will be replaced on client)
    return crypto.randomUUID();
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidUUID(stored)) {
    return stored;
  }

  // Generate, persist, and return a new UUID
  const newId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}

/**
 * Removes the guest session ID from localStorage.
 * Called after successful auth claim (Story 8-5) to prevent stale guest sessions.
 */
export function clearGuestSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
