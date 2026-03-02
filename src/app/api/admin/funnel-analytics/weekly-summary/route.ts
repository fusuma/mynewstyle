import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAuthorized } from '@/lib/admin/auth';
import { isAnalyticsTableMissingError } from '@/lib/admin/supabase-errors';

/**
 * Shape of a single funnel step returned by the weekly summary RPC.
 */
interface FunnelStep {
  step_name: string;
  step_order: number;
  unique_sessions: number;
  previous_step_sessions: number | null;
  dropoff_rate: number | null;
}

/**
 * Shape of the raw data returned by the funnel_weekly_summary SQL function.
 * The SQL function returns a JSONB object with this structure.
 */
interface WeeklySummaryRaw {
  current_week: {
    from: string;
    to: string;
    funnel: FunnelStep[];
  };
  previous_week: {
    from: string;
    to: string;
    funnel: FunnelStep[];
  };
  deltas: Array<{
    step_name: string;
    current_sessions: number;
    previous_sessions: number;
    delta_percent: number | null;
  }>;
}

/**
 * Extracts the unique_sessions count for a specific step from a funnel array.
 * Returns 0 if the step is not found.
 */
function getStepSessions(funnel: FunnelStep[], stepName: string): number {
  const step = funnel.find((s) => s.step_name === stepName);
  return step ? step.unique_sessions : 0;
}

/**
 * Computes an overall conversion rate (sessions_at_step / sessions_at_landing).
 * Returns 0 if landing has 0 sessions.
 */
function computeConversionRate(landingSessions: number, targetSessions: number): number {
  if (landingSessions === 0) return 0;
  return targetSessions / landingSessions;
}

/**
 * Computes the delta between two conversion rates.
 * Returns null if the previous rate is 0 (undefined delta).
 */
function computeConversionDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return current - previous;
}

/**
 * Maps a raw funnel step array to the camelCase API response format.
 */
function mapFunnelSteps(
  steps: FunnelStep[]
): Array<{
  step: string;
  order: number;
  sessions: number;
  previousStepSessions: number | null;
  dropoffRate: number | null;
}> {
  return steps.map((s) => ({
    step: s.step_name,
    order: s.step_order,
    sessions: s.unique_sessions,
    previousStepSessions: s.previous_step_sessions,
    dropoffRate: s.dropoff_rate,
  }));
}

/**
 * GET /api/admin/funnel-analytics/weekly-summary
 *
 * Returns a weekly comparison report: current 7 days vs previous 7 days.
 * Includes per-step delta percentages and overall landing-to-payment and
 * landing-to-share conversion rates.
 *
 * Auth: Bearer <ADMIN_SECRET> or ?secret=<ADMIN_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // reference_date defaults to today in the SQL function
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { data, error } = await supabase.rpc('funnel_weekly_summary', {
      reference_date: today,
    });

    if (error) {
      // Graceful degradation: analytics_events table not yet created
      if (isAnalyticsTableMissingError(error as { message?: string; code?: string })) {
        return NextResponse.json(
          {
            error: 'analytics_events table not available',
            hint: 'Complete story 10-1 first',
          },
          { status: 503 }
        );
      }
      console.error('[GET /api/admin/funnel-analytics/weekly-summary] RPC error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const raw = data as WeeklySummaryRaw;

    // Safe defaults for empty data
    const currentFunnel: FunnelStep[] = raw?.current_week?.funnel ?? [];
    const previousFunnel: FunnelStep[] = raw?.previous_week?.funnel ?? [];
    const rawDeltas = raw?.deltas ?? [];

    // Compute overall conversion rates: landing → payment and landing → share
    const currentLanding = getStepSessions(currentFunnel, 'landing');
    const previousLanding = getStepSessions(previousFunnel, 'landing');
    const currentPayment = getStepSessions(currentFunnel, 'payment_completed');
    const previousPayment = getStepSessions(previousFunnel, 'payment_completed');
    const currentShare = getStepSessions(currentFunnel, 'share_generated');
    const previousShare = getStepSessions(previousFunnel, 'share_generated');

    const currentPaymentConv = computeConversionRate(currentLanding, currentPayment);
    const previousPaymentConv = computeConversionRate(previousLanding, previousPayment);
    const currentShareConv = computeConversionRate(currentLanding, currentShare);
    const previousShareConv = computeConversionRate(previousLanding, previousShare);

    return NextResponse.json({
      currentWeek: {
        from: raw?.current_week?.from ?? null,
        to: raw?.current_week?.to ?? null,
        funnel: mapFunnelSteps(currentFunnel),
      },
      previousWeek: {
        from: raw?.previous_week?.from ?? null,
        to: raw?.previous_week?.to ?? null,
        funnel: mapFunnelSteps(previousFunnel),
      },
      deltas: rawDeltas.map((d) => ({
        step: d.step_name,
        currentSessions: d.current_sessions,
        previousSessions: d.previous_sessions,
        deltaPercent: d.delta_percent,
      })),
      overallConversion: {
        landingToPayment: {
          current: currentPaymentConv,
          previous: previousPaymentConv,
          delta: computeConversionDelta(currentPaymentConv, previousPaymentConv),
        },
        landingToShare: {
          current: currentShareConv,
          previous: previousShareConv,
          delta: computeConversionDelta(currentShareConv, previousShareConv),
        },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GET /api/admin/funnel-analytics/weekly-summary] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
