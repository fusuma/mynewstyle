import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripeServer } from '@/lib/stripe/server';
import {
  determinePrice,
  CURRENCY,
} from '@/lib/stripe/pricing';
import { consultations } from '@/app/api/consultation/start/route';
import { validateGuestSessionHeader } from '@/lib/supabase/guest-context';

// Local type extension for payment fields (src/types/index.ts is frozen)
interface PaymentConsultationRecord {
  paymentStatus: 'none' | 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId: string | null;
}

const CreatePaymentIntentSchema = z.object({
  consultationId: z.string().uuid('consultationId must be a valid UUID'),
  type: z.enum(['first', 'repeat']).optional(),
  email: z.string().email('email must be a valid email address').optional(),
});

type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;


export async function POST(request: NextRequest) {
  let body: unknown;

  // Parse JSON body
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Validate with Zod
  const result = CreatePaymentIntentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { consultationId, type, email }: CreatePaymentIntentInput = result.data;

  // Validate x-guest-session-id header if present (Story 8.4, Task 7.1)
  // Reject with 400 if header exists but is not a valid UUID
  const rawGuestHeader = request.headers.get('x-guest-session-id');
  if (rawGuestHeader !== null) {
    const validatedGuestId = validateGuestSessionHeader(rawGuestHeader);
    if (!validatedGuestId) {
      return NextResponse.json(
        { error: 'x-guest-session-id must be a valid UUID' },
        { status: 400 }
      );
    }
  }
  const guestSessionId = rawGuestHeader
    ? validateGuestSessionHeader(rawGuestHeader)
    : null;

  // Look up consultation
  const consultation = consultations.get(consultationId);
  if (!consultation) {
    return NextResponse.json(
      { error: 'Consultation not found' },
      { status: 404 }
    );
  }

  try {
    // Guest detection (Story 8.4, Task 7.1):
    // - If x-guest-session-id header is present → guest user
    // - If no auth session exists (pre-auth) → also treated as guest
    // When Supabase Auth is active (Stories 8-1/8-2/8-3), this logic should
    // additionally check for a valid auth session cookie. For now, all users
    // without an auth session are guests.
    const isGuest = true; // All users are guests until auth is implemented (Epic 8 Stories 8-1..8-3)
    const hasPreviousPaidConsultation = false;

    // Use client-supplied type hint if provided; otherwise derive from history.
    // 'repeat' maps to a returning user (discount pricing).
    let pricingResult = determinePrice(isGuest, hasPreviousPaidConsultation);
    if (!isGuest && type === 'repeat') {
      pricingResult = determinePrice(false, true);
    } else if (!isGuest && type === 'first') {
      pricingResult = determinePrice(false, false);
    }
    const { amount, userType } = pricingResult;

    const stripe = getStripeServer();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        consultationId,
        userType: String(userType),
        // Store guest_session_id in metadata for reconciliation (Story 8.4, Task 7.3)
        ...(guestSessionId ? { guestSessionId } : {}),
      },
      // Stripe automatically sends receipt email on successful payment when set
      ...(email ? { receipt_email: email } : {}),
    });

    if (!paymentIntent.client_secret) {
      console.error('[POST /api/payment/create-intent] PaymentIntent has no client_secret:', paymentIntent.id);
      return NextResponse.json(
        { error: 'Payment setup failed: no client secret returned' },
        { status: 500 }
      );
    }

    // Update consultation record with payment fields
    const updatedConsultation = {
      ...consultation,
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending' as PaymentConsultationRecord['paymentStatus'],
    };
    consultations.set(consultationId, updatedConsultation);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: CURRENCY,
      userType,
    });
  } catch (error) {
    console.error('[POST /api/payment/create-intent] Stripe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
