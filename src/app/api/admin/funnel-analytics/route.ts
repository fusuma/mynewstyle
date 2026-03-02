import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAuthorized } from '@/lib/admin/auth';
import { isAnalyticsTableMissingError } from '@/lib/admin/supabase-errors';

/**
 * Valid values for the gender filter query param.
 */
const VALID_GENDERS = ['male', 'female'] as const;
type Gender = (typeof VALID_GENDERS)[number];

/**
 * Valid values for the device filter query param.
 */
const VALID_DEVICES = ['mobile', 'desktop', 'tablet'] as const;
type Device = (typeof VALID_DEVICES)[number];

/**
 * Row shape returned by the funnel_counts SQL function.
 */
interface FunnelCountRow {
  step_name: string;
  step_order: number;
  unique_sessions: number;
  previous_step_sessions: number | null;
  dropoff_rate: number | null;
}

/**
 * GET /api/admin/funnel-analytics
 *
 * Returns the 10-step conversion funnel data, optionally filtered by gender,
 * device type, and date range.
 *
 * Auth: Bearer <ADMIN_SECRET> or ?secret=<ADMIN_SECRET>
 *
 * Query params:
 *   gender  - optional: 'male' | 'female'
 *   device  - optional: 'mobile' | 'desktop' | 'tablet'
 *   from    - optional: ISO date string (default: 7 days ago)
 *   to      - optional: ISO date string (default: now)
 *   period  - optional: 'daily' | 'weekly' | 'monthly' (default: 'weekly', informational only)
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate gender filter
    const genderParam = searchParams.get('gender');
    const genderFilter: Gender | null =
      genderParam && (VALID_GENDERS as readonly string[]).includes(genderParam)
        ? (genderParam as Gender)
        : null;

    // Parse and validate device filter
    const deviceParam = searchParams.get('device');
    const deviceFilter: Device | null =
      deviceParam && (VALID_DEVICES as readonly string[]).includes(deviceParam)
        ? (deviceParam as Device)
        : null;

    // Parse date range — default to last 7 days
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
    const toDate = toParam ? new Date(toParam) : now;

    // Validate that parsed dates are valid (invalid strings produce NaN timestamps)
    if (isNaN(fromDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid "from" date parameter. Expected ISO date string (e.g. 2026-01-01).' },
        { status: 400 }
      );
    }
    if (isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid "to" date parameter. Expected ISO date string (e.g. 2026-01-31).' },
        { status: 400 }
      );
    }
    if (fromDate > toDate) {
      return NextResponse.json(
        { error: '"from" date must not be after "to" date.' },
        { status: 400 }
      );
    }

    // Parse period (informational — stored in response but doesn't change query logic)
    const periodParam = searchParams.get('period');
    const period =
      periodParam === 'daily' || periodParam === 'weekly' || periodParam === 'monthly'
        ? periodParam
        : 'weekly';

    const supabase = createServiceRoleClient();

    // Call the funnel_counts PostgreSQL function
    const { data, error } = await supabase.rpc('funnel_counts', {
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString(),
      gender_filter: genderFilter,
      device_filter: deviceFilter,
    });

    if (error) {
      // Graceful degradation: if analytics_events table doesn't exist yet
      if (isAnalyticsTableMissingError(error as { message?: string; code?: string })) {
        return NextResponse.json(
          {
            error: 'analytics_events table not available',
            hint: 'Complete story 10-1 first',
          },
          { status: 503 }
        );
      }
      console.error('[GET /api/admin/funnel-analytics] RPC error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Map snake_case SQL response to camelCase API response
    const funnel = ((data as FunnelCountRow[]) ?? []).map((row) => ({
      step: row.step_name,
      order: row.step_order,
      sessions: row.unique_sessions,
      previousStepSessions: row.previous_step_sessions,
      dropoffRate: row.dropoff_rate,
    }));

    return NextResponse.json({
      funnel,
      filters: {
        gender: genderFilter,
        device: deviceFilter,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        period,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GET /api/admin/funnel-analytics] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
