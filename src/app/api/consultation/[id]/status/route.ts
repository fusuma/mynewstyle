import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation ID'),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const parseResult = ParamsSchema.safeParse(resolvedParams);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid consultation ID' },
      { status: 400 }
    );
  }

  const { id } = parseResult.data;
  const supabase = createServerSupabaseClient();

  const { data: consultation, error } = await supabase
    .from('consultations')
    .select('id, status, payment_status')
    .eq('id', id)
    .single();

  // PGRST116 = "no rows found" -- return 404 only for genuine not-found
  // Any other error code is an unexpected DB failure -- return 500
  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }
    console.error('[GET /api/consultation/[id]/status] Supabase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  if (!consultation) {
    return NextResponse.json(
      { error: 'Consultation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: consultation.id,
    status: consultation.status,
    paymentStatus: consultation.payment_status,
  });
}
