/**
 * Formats an ISO date string to a human-readable European Portuguese date.
 *
 * Example: "2026-01-15T10:00:00Z" → "15 jan. 2026"
 *
 * Uses pt-PT locale (European Portuguese) consistent with the app's target audience.
 * Falls back to the raw ISO string if formatting fails.
 */
export function formatProfileDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
