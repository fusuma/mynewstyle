import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/consultation/start/route';
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
  questionnaire: {
    'q1': 'answer1',
    'q2': ['option1', 'option2'],
    'q3': 3,
  },
};

describe('POST /api/consultation/start', () => {
  it('returns 201 with consultationId for valid payload', async () => {
    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('consultationId');
    expect(typeof data.consultationId).toBe('string');
  });

  it('returns consultationId in valid UUID format', async () => {
    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(data.consultationId).toMatch(uuidRegex);
  });

  it('returns 400 when gender is missing', async () => {
    const { gender, ...payload } = validPayload;
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when gender is invalid', async () => {
    const request = createRequest({ ...validPayload, gender: 'other' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when photoUrl is missing', async () => {
    const { photoUrl, ...payload } = validPayload;
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when photoUrl is empty string', async () => {
    const request = createRequest({ ...validPayload, photoUrl: '' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when questionnaire is empty object', async () => {
    const request = createRequest({ ...validPayload, questionnaire: {} });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when questionnaire is missing', async () => {
    const { questionnaire, ...payload } = validPayload;
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns response with application/json content-type', async () => {
    const request = createRequest(validPayload);
    const response = await POST(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('accepts female gender', async () => {
    const request = createRequest({ ...validPayload, gender: 'female' });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('consultationId');
  });

  it('generates unique consultationIds for different requests', async () => {
    const request1 = createRequest(validPayload);
    const request2 = createRequest(validPayload);
    const response1 = await POST(request1);
    const response2 = await POST(request2);
    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.consultationId).not.toBe(data2.consultationId);
  });
});
