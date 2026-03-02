/**
 * Shared admin authentication utility for admin API routes.
 * Used by /api/admin/ai-cost-summary and /api/admin/alerts/check.
 *
 * Accepts:
 * - Authorization: Bearer <ADMIN_SECRET> header (for manual admin access)
 * - Authorization: Bearer <CRON_SECRET> header (for Vercel Cron automated calls, AC #8)
 * - ?secret=<ADMIN_SECRET> query param (fallback for dashboard tools that can't set headers)
 */
import type { NextRequest } from 'next/server';

/**
 * Verifies the request carries a valid admin or cron secret.
 * Returns true if authorized, false otherwise.
 */
export function isAuthorized(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is configured at all, deny all access to prevent accidental exposure
  if (!adminSecret && !cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Accept either ADMIN_SECRET or CRON_SECRET (for Vercel Cron jobs)
    if (adminSecret && token === adminSecret) return true;
    if (cronSecret && token === cronSecret) return true;
    return false;
  }

  // Fallback: accept ?secret= query param for dashboard tools
  const querySecret = request.nextUrl.searchParams.get('secret');
  if (querySecret) {
    if (adminSecret && querySecret === adminSecret) return true;
    if (cronSecret && querySecret === cronSecret) return true;
    return false;
  }

  return false;
}
