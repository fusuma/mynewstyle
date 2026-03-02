import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Set env vars before any imports
// ---------------------------------------------------------------------------
process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
process.env.KIE_API_KEY = 'test-api-key';

// ---------------------------------------------------------------------------
// Mock the kie webhooks library module
// ---------------------------------------------------------------------------
const mockVerifyKieWebhook = vi.fn();
const mockProcessKieCallback = vi.fn().mockResolvedValue({ status: 'ok', message: 'done' });

vi.mock('@/lib/kie/webhooks', () => ({
  verifyKieWebhook: (...args: unknown[]) => mockVerifyKieWebhook(...args),
  processKieCallback: (...args: unknown[]) => mockProcessKieCallback(...args),
}));

// ---------------------------------------------------------------------------
// Helper: compute valid HMAC signature
// ---------------------------------------------------------------------------
function computeValidSignature(taskId: string, timestamp: string, key: string): string {
  const data = `${taskId}.${timestamp}`;
  return createHmac('sha256', key).update(data).digest('base64');
}

// ---------------------------------------------------------------------------
// Helper: create a simulated webhook Request
// ---------------------------------------------------------------------------
const TASK_ID = 'ee9c2715375b7837f8bb51d641ff5863';
// Use a fresh timestamp so the replay attack protection does not reject it
const TIMESTAMP = String(Math.floor(Date.now() / 1000));

function createKieWebhookRequest(
  body: object,
  opts: { includeTimestamp?: boolean; includeSignature?: boolean; signature?: string } = {}
): Request {
  const { includeTimestamp = true, includeSignature = true, signature } = opts;
  const sig = signature ?? computeValidSignature(TASK_ID, TIMESTAMP, 'test-hmac-key');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (includeTimestamp) headers['X-Webhook-Timestamp'] = TIMESTAMP;
  if (includeSignature) headers['X-Webhook-Signature'] = sig;

  return new Request('http://localhost:3000/api/webhook/kie', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('POST /api/webhook/kie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: verification succeeds
    mockVerifyKieWebhook.mockReturnValue(true);
  });

  it('returns 400 when taskId is missing from the request body', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest(
      // No taskId field — empty body
      { code: 200, msg: 'Success', data: { callbackType: 'task_completed' } }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('taskId');
  });

  it('returns 400 when taskId is an empty string', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest({ taskId: '' });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 401 when X-Webhook-Signature header is missing', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest(
      { taskId: TASK_ID, code: 200, msg: 'Success', data: { task_id: TASK_ID, callbackType: 'task_completed' } },
      { includeSignature: false }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('signature');
  });

  it('returns 401 when X-Webhook-Timestamp header is missing', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest(
      { taskId: TASK_ID, code: 200, msg: 'Success', data: { task_id: TASK_ID, callbackType: 'task_completed' } },
      { includeTimestamp: false }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 401 when signature verification fails', async () => {
    mockVerifyKieWebhook.mockReturnValue(false);

    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest(
      { taskId: TASK_ID, code: 200, msg: 'Success', data: { task_id: TASK_ID, callbackType: 'task_completed' } },
      { signature: 'invalid_signature' }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('calls verifyKieWebhook with taskId, timestamp, and signature', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const sig = computeValidSignature(TASK_ID, TIMESTAMP, 'test-hmac-key');
    const request = createKieWebhookRequest(
      { taskId: TASK_ID, code: 200, msg: 'Success', data: { task_id: TASK_ID, callbackType: 'task_completed' } },
      { signature: sig }
    );

    await POST(request);

    expect(mockVerifyKieWebhook).toHaveBeenCalledWith(TASK_ID, TIMESTAMP, sig);
  });

  it('calls processKieCallback with taskId after successful verification', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest({
      taskId: TASK_ID,
      code: 200,
      msg: 'Success',
      data: { task_id: TASK_ID, callbackType: 'task_completed' },
    });

    await POST(request);

    expect(mockProcessKieCallback).toHaveBeenCalledWith(TASK_ID);
  });

  it('returns 200 with { received: true } on successful processing', async () => {
    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest({
      taskId: TASK_ID,
      code: 200,
      msg: 'Success',
      data: { task_id: TASK_ID, callbackType: 'task_completed' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('returns 200 even when processKieCallback returns an error status', async () => {
    mockProcessKieCallback.mockResolvedValueOnce({
      status: 'error',
      message: 'DB error during processing',
    });

    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest({
      taskId: TASK_ID,
      code: 200,
      msg: 'Success',
      data: { task_id: TASK_ID, callbackType: 'task_completed' },
    });

    const response = await POST(request);
    // CRITICAL: Always return 200 to prevent Kie.ai retry storms
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('returns 200 even when processKieCallback throws an unexpected error', async () => {
    mockProcessKieCallback.mockRejectedValueOnce(new Error('Unexpected crash'));

    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest({
      taskId: TASK_ID,
      code: 200,
      msg: 'Success',
      data: { task_id: TASK_ID, callbackType: 'task_completed' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('logs [webhook/kie] prefix for received callback', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest({
      taskId: TASK_ID,
      code: 200,
      msg: 'Success',
      data: { task_id: TASK_ID, callbackType: 'task_completed' },
    });

    await POST(request);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[webhook/kie]')
    );
    consoleSpy.mockRestore();
  });

  it('logs [webhook/kie] prefix with console.error on signature failure', async () => {
    mockVerifyKieWebhook.mockReturnValue(false);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { POST } = await import('@/app/api/webhook/kie/route');
    const request = createKieWebhookRequest(
      { taskId: TASK_ID, code: 200, msg: 'Success', data: {} },
      { signature: 'bad_sig' }
    );
    await POST(request);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[webhook/kie]')
    );
    consoleSpy.mockRestore();
  });
});
