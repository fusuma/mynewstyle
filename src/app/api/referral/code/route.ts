import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateReferralCode } from '@/lib/referral/generate-code';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mynewstyle.com';

/**
 * GET /api/referral/code
 *
 * Returns the authenticated user's referral code and full referral link.
 * - Returns 401 for unauthenticated users (AC #5).
 * - Returns existing code or generates + persists a new one (AC #9).
 * - Referral link format: {SITE_URL}/?ref=CODE (AC #2).
 *
 * Auth note: uses RLS-aware client to SELECT, service role client to INSERT
 * (because RLS only GRANTs SELECT to authenticated users per migration).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user via RLS-aware client
    const supabase = createAuthenticatedSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Try to find existing referral code for this user (RLS-aware SELECT)
    const { data: existingRow, error: selectError } = await supabase
      .from('referral_codes')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    // PGRST116 = "no rows returned" — expected when user has no code yet, not an error
    if (selectError && selectError.code !== 'PGRST116') {
      // Unexpected DB error — bail out before attempting INSERT
      console.error('[GET /api/referral/code] SELECT error:', selectError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (existingRow?.referral_code) {
      const referralCode = existingRow.referral_code;
      return NextResponse.json({
        referralCode,
        referralLink: `${SITE_URL}/?ref=${referralCode}`,
      });
    }

    // 3. No existing code — generate deterministically and INSERT via service role
    const referralCode = generateReferralCode(user.id);
    const serviceClient = createServiceRoleClient();

    const { data: insertedRow, error: insertError } = await serviceClient
      .from('referral_codes')
      .insert({ user_id: user.id, referral_code: referralCode })
      .select('referral_code')
      .single();

    if (insertError) {
      // Handle unique constraint violation (race condition — another request already inserted)
      if (insertError.code === '23505') {
        // Re-fetch the existing code
        const { data: retryRow } = await supabase
          .from('referral_codes')
          .select('referral_code')
          .eq('user_id', user.id)
          .single();

        if (retryRow?.referral_code) {
          return NextResponse.json({
            referralCode: retryRow.referral_code,
            referralLink: `${SITE_URL}/?ref=${retryRow.referral_code}`,
          });
        }
      }
      console.error('[GET /api/referral/code] INSERT error:', insertError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const finalCode = insertedRow?.referral_code ?? referralCode;
    return NextResponse.json({
      referralCode: finalCode,
      referralLink: `${SITE_URL}/?ref=${finalCode}`,
    });
  } catch (error) {
    console.error('[GET /api/referral/code] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
