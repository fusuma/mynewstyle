/**
 * Tests for Story 11.2: Consent Flow
 * Consultation Start API - photoConsentGivenAt field
 *
 * Tests cover:
 * - Task 7.4: consultation start API rejects requests missing photoConsentGivenAt
 * - Task 7.5: consultation start API accepts valid photoConsentGivenAt timestamp
 */

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

const validPayloadWithConsent = {
  gender: 'male',
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQ',
  questionnaire: {
    q1: 'answer1',
    q2: ['option1', 'option2'],
    q3: 3,
  },
  photoConsentGivenAt: new Date().toISOString(),
};

const validPayloadWithoutConsent = {
  gender: 'male',
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQ',
  questionnaire: {
    q1: 'answer1',
  },
  // photoConsentGivenAt intentionally omitted
};

describe('POST /api/consultation/start - photoConsentGivenAt', () => {
  // Task 7.4: API rejects requests missing photoConsentGivenAt
  it('returns 400 when photoConsentGivenAt is missing', async () => {
    const request = createRequest(validPayloadWithoutConsent);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when photoConsentGivenAt is an empty string', async () => {
    const request = createRequest({ ...validPayloadWithConsent, photoConsentGivenAt: '' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when photoConsentGivenAt is not a valid ISO datetime', async () => {
    const request = createRequest({ ...validPayloadWithConsent, photoConsentGivenAt: 'not-a-date' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  // Task 7.5: API accepts valid photoConsentGivenAt timestamp
  it('returns 201 with consultationId when photoConsentGivenAt is a valid ISO timestamp', async () => {
    const request = createRequest(validPayloadWithConsent);
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('consultationId');
    expect(typeof data.consultationId).toBe('string');
  });

  it('stores photoConsentGivenAt on the consultation record', async () => {
    const consentTimestamp = new Date().toISOString();
    const request = createRequest({
      ...validPayloadWithConsent,
      photoConsentGivenAt: consentTimestamp,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);

    // Verify the record has the consent timestamp stored
    const record = consultations.get(data.consultationId);
    expect(record).toBeDefined();
    expect(record?.photo_consent_given_at).toBe(consentTimestamp);
  });

  it('accepts photoConsentGivenAt with timezone offset (ISO 8601)', async () => {
    // ISO 8601 with timezone offset
    const isoWithOffset = '2026-03-03T10:00:00+00:00';
    const request = createRequest({
      ...validPayloadWithConsent,
      photoConsentGivenAt: isoWithOffset,
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('still accepts optional guestSessionId alongside photoConsentGivenAt', async () => {
    const request = createRequest({
      ...validPayloadWithConsent,
      guestSessionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('consultationId');
  });
});
