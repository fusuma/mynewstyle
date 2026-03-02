import { NextResponse } from 'next/server';
import { verifyKieWebhook, processKieCallback } from '@/lib/kie/webhooks';

/**
 * POST /api/webhook/kie
 *
 * Receives Kie.ai task completion callbacks, verifies HMAC-SHA256 signatures,
 * and dispatches async image processing.
 *
 * Signature verification:
 *   HMAC-SHA256(taskId + "." + X-Webhook-Timestamp, KIE_WEBHOOK_HMAC_KEY) → base64
 *   Compared against X-Webhook-Signature header via crypto.timingSafeEqual
 *
 * Returns:
 *   401 — missing or invalid signature (prevents processing unverified callbacks)
 *   200 — all verified callbacks, even when internal processing errors occur
 *         (prevents Kie.ai from retrying callbacks that will always fail)
 */
export async function POST(request: Request) {
  // 1. Parse request body as JSON
  // Note: Kie.ai HMAC is computed from taskId+timestamp (not the body),
  // so we can parse JSON before signature verification.
  let taskId: string;
  try {
    const body = await request.json() as { taskId?: string };
    taskId = body.taskId ?? '';
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Reject empty taskId early — no valid webhook should have a blank taskId
  if (!taskId) {
    console.error('[webhook/kie] Missing or empty taskId in request body');
    return NextResponse.json(
      { error: 'Missing taskId in request body' },
      { status: 400 }
    );
  }

  // 2. Extract webhook signature headers
  const timestamp = request.headers.get('X-Webhook-Timestamp');
  const signature = request.headers.get('X-Webhook-Signature');

  if (!timestamp || !signature) {
    console.error(
      `[webhook/kie] Missing required headers — timestamp: ${!!timestamp}, signature: ${!!signature}`
    );
    return NextResponse.json(
      { error: 'Missing webhook signature headers (X-Webhook-Timestamp, X-Webhook-Signature)' },
      { status: 401 }
    );
  }

  // 3. Verify HMAC-SHA256 signature
  const isValid = verifyKieWebhook(taskId, timestamp, signature);

  if (!isValid) {
    console.error(
      `[webhook/kie] Signature verification failed for taskId: ${taskId}`
    );
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 401 }
    );
  }

  // 4. Log verified callback receipt
  console.log(`[webhook/kie] Received verified callback for taskId: ${taskId}`);

  // 5. Process callback — always return 200 for verified webhooks
  // Even if processing encounters internal errors, we return 200 to prevent
  // Kie.ai from retrying callbacks that may cause duplicate processing.
  try {
    const result = await processKieCallback(taskId);

    if (result.status === 'error') {
      console.error(
        `[webhook/kie] Processing error for taskId: ${taskId}:`,
        result.message
      );
    } else {
      console.log(
        `[webhook/kie] Processing complete for taskId: ${taskId}:`,
        result.message
      );
    }
  } catch (error) {
    // Catch any unexpected errors and log — but still return 200
    console.error(
      `[webhook/kie] Unexpected error processing taskId: ${taskId}:`,
      error
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
