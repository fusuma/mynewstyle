import { describe, it, expect, beforeEach } from 'vitest';
import { POST, consultations } from '@/app/api/consultation/start/route';
import { NextRequest } from 'next/server';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/consultation/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  gender: 'male',
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQ',
  questionnaire: { q1: 'answer1' },
};

describe('POST /api/consultation/start — referral code (AC #4)', () => {
  beforeEach(() => {
    consultations.clear();
  });

  it('stores referral code on consultation record when provided', async () => {
    const payload = { ...validPayload, referralCode: 'ABC1234' };
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    const record = consultations.get(data.consultationId);

    expect(record).toBeDefined();
    expect(record?.referral_code).toBe('ABC1234');
  });

  it('leaves referral_code null when not provided in payload', async () => {
    const request = createRequest(validPayload);
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    const record = consultations.get(data.consultationId);

    expect(record).toBeDefined();
    expect(record?.referral_code).toBeNull();
  });

  it('returns 400 for referral code that is too long (> 8 chars)', async () => {
    const payload = { ...validPayload, referralCode: 'TOOLONGCODE123' };
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 for referral code with special characters', async () => {
    const payload = { ...validPayload, referralCode: 'AB!@#$%' };
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('accepts an empty referralCode as undefined (treated as absent)', async () => {
    // referralCode being absent entirely should still return 201
    const request = createRequest(validPayload);
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('existing payload fields still work with referral code present', async () => {
    const payload = {
      ...validPayload,
      guestSessionId: '550e8400-e29b-41d4-a716-446655440000',
      referralCode: 'XYZ1234',
    };
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    const record = consultations.get(data.consultationId);

    expect(record?.referral_code).toBe('XYZ1234');
    expect(record?.guest_session_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
