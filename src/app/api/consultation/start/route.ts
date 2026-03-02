import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ConsultationRecord } from '@/types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ConsultationStartSchema = z.object({
  gender: z.enum(['male', 'female']),
  photoUrl: z.string().min(1),
  questionnaire: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), z.number()])
  ),
  /**
   * Optional guest session UUID (Story 8.4).
   * When provided, must be a valid UUID v4. Stored on the consultation record
   * so RLS policies and API routes can grant guest access.
   */
  guestSessionId: z
    .string()
    .regex(UUID_REGEX, 'guestSessionId must be a valid UUID')
    .optional(),
});

// Refine to ensure questionnaire is non-empty
const ConsultationStartSchemaRefined = ConsultationStartSchema.refine(
  (data) => Object.keys(data.questionnaire).length > 0,
  { message: 'Questionnaire must have at least one response', path: ['questionnaire'] }
);

// In-memory storage (placeholder until Supabase integration in Epic 4)
const consultations = new Map<string, ConsultationRecord>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = ConsultationStartSchemaRefined.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { gender, photoUrl, questionnaire, guestSessionId } = result.data;
    const consultationId = crypto.randomUUID();

    const record: ConsultationRecord = {
      id: consultationId,
      gender,
      photoUrl,
      questionnaireResponses: questionnaire,
      status: 'pending',
      createdAt: new Date().toISOString(),
      guest_session_id: guestSessionId ?? null,
    };

    consultations.set(consultationId, record);

    return NextResponse.json({ consultationId }, { status: 201 });
  } catch (error) {
    // JSON parse errors indicate bad client input (400)
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    // Any other error is an unexpected server error (500)
    console.error('[POST /api/consultation/start] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export for testing purposes
export { consultations };
