import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripeServer } from '@/lib/stripe/server';
import {
  determinePrice,
  CURRENCY,
} from '@/lib/stripe/pricing';
import { consultations } from '@/app/api/consultation/start/route';

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

  // Look up consultation
  const consultation = consultations.get(consultationId);
  if (!consultation) {
    return NextResponse.json(
      { error: 'Consultation not found' },
      { status: 404 }
    );
  }

  try {
    // Temporary guest detection (until Epic 8 auth)
    // All users are treated as guests until auth is implemented (Epic 8).
    // When auth exists: resolve isGuest from session and hasPreviousPaidConsultation from DB.
    const isGuest = true;
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
