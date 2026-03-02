import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripeServer } from '@/lib/stripe/server';
import {
  determinePrice,
  CURRENCY,
  type UserPricingType,
} from '@/lib/stripe/pricing';
import { consultations } from '@/app/api/consultation/start/route';

// Local type extension for payment fields (src/types/index.ts is frozen)
interface PaymentConsultationRecord {
  paymentStatus: 'free' | 'pending' | 'paid' | 'refunded';
  paymentIntentId: string | null;
}

const CreatePaymentIntentSchema = z.object({
  consultationId: z.string().uuid('consultationId must be a valid UUID'),
  type: z.enum(['first', 'repeat']).optional(),
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

  const { consultationId }: CreatePaymentIntentInput = result.data;

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
    const isGuest = true; // All users are guests until auth is implemented
    const hasPreviousPaidConsultation = false; // Cannot verify without auth

    const { amount, userType } = determinePrice(isGuest, hasPreviousPaidConsultation);

    const stripe = getStripeServer();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        consultationId,
        userType: userType as UserPricingType,
      },
    });

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
