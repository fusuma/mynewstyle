/**
 * Shared Supabase error detection utilities for admin API routes.
 */

/**
 * Determines whether a Supabase RPC error indicates that a required table is missing.
 *
 * Matches:
 *   - PostgreSQL error code 42P01 (undefined_table): the exact signal that a table
 *     does not exist. This is the authoritative check and should always be preferred.
 *   - Message contains "does not exist" AND "analytics_events": catches cases where
 *     Supabase wraps the PG error without preserving the code field, but scoped tightly
 *     to avoid false positives from unrelated column-missing or function-missing errors.
 *
 * @param error - The error object from a Supabase RPC call.
 * @returns true if the error is caused by the analytics_events table not existing.
 */
export function isAnalyticsTableMissingError(error: {
  message?: string;
  code?: string;
}): boolean {
  if (error.code === '42P01') return true;
  // Tighter message check: require BOTH "does not exist" AND "analytics_events"
  // to avoid false positives from errors like "column analytics_events.x does not exist"
  if (
    error.message &&
    error.message.includes('does not exist') &&
    error.message.includes('analytics_events')
  ) {
    return true;
  }
  return false;
}
