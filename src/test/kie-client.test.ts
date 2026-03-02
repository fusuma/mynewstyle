import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KieClient } from '@/lib/ai/kie';
import type { KieJobResponse } from '@/lib/ai/kie';

// Mock process.env
const originalEnv = process.env;

describe('KieClient', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KIE_API_KEY: 'test-kie-api-key',
    };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('initializes without throwing when KIE_API_KEY is set', () => {
      expect(() => new KieClient()).not.toThrow();
    });

    it('throws when KIE_API_KEY is not set', () => {
      delete process.env.KIE_API_KEY;
      expect(() => new KieClient()).toThrow('KIE_API_KEY');
    });
  });

  describe('createPreviewTask', () => {
    const photoUrl = 'https://storage.example.com/photo.jpg';
    const stylePrompt =
      'Edit this person\'s hairstyle to a Modern Undercut. Keep the face, skin tone, and expression exactly the same. Only change the hairstyle. Photorealistic result.';
    const callbackUrl = 'https://mynewstyle.com/api/webhook/kie';

    it('calls Kie.ai API with correct payload structure', async () => {
      const mockResponse: KieJobResponse = {
        code: 200,
        msg: 'success',
        data: { taskId: 'task_nano-banana-2_1765178625768' },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const client = new KieClient();
      await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);

      expect(fetch).toHaveBeenCalledOnce();
      const [url, options] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe('https://api.kie.ai/api/v1/jobs/createTask');
      expect(options?.method).toBe('POST');

      const headers = options?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-kie-api-key');
      expect(headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options?.body as string);
      expect(body.model).toBe('nano-banana-2');
      expect(body.callBackUrl).toBe(callbackUrl);
      expect(body.input.prompt).toBe(stylePrompt);
      expect(body.input.aspect_ratio).toBe('3:4');
      expect(body.input.resolution).toBe('2K');
      expect(body.input.output_format).toBe('jpg');
      expect(body.input.google_search).toBe(false);
      expect(body.input.image_input).toEqual([photoUrl]);
    });

    it('returns taskId from successful response', async () => {
      const expectedTaskId = 'task_nano-banana-2_1765178625768';
      const mockResponse: KieJobResponse = {
        code: 200,
        msg: 'success',
        data: { taskId: expectedTaskId },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const client = new KieClient();
      const result = await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);

      expect(result.taskId).toBe(expectedTaskId);
    });

    it('throws KieApiError with status code on 401 unauthorized', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, msg: 'Unauthorized' }),
      } as Response);

      const client = new KieClient();
      let caughtError: any;
      try {
        await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);
        expect.fail('Should have thrown');
      } catch (err: any) {
        caughtError = err;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError.status).toBe(401);
    });

    it('throws KieApiError with status code on 429 rate limited', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ code: 429, msg: 'Rate limit exceeded' }),
      } as Response);

      const client = new KieClient();
      try {
        await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(429);
      }
    });

    it('throws KieApiError with status code on 500 server error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, msg: 'Internal Server Error' }),
      } as Response);

      const client = new KieClient();
      try {
        await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(500);
      }
    });

    it('throws on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const client = new KieClient();
      await expect(client.createPreviewTask(photoUrl, stylePrompt, callbackUrl)).rejects.toThrow(
        'Network error'
      );
    });

    it('throws KieApiError even when error response body is not JSON (e.g. HTML error page)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
      } as Response);

      const client = new KieClient();
      try {
        await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.name).toBe('KieApiError');
      }
    });

    it('uses model nano-banana-2 in payload', async () => {
      const mockResponse: KieJobResponse = {
        code: 200,
        msg: 'success',
        data: { taskId: 'task_nano-banana-2_123' },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const client = new KieClient();
      await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(body.model).toBe('nano-banana-2');
    });

    it('uses aspect_ratio 3:4 for portrait orientation', async () => {
      const mockResponse: KieJobResponse = {
        code: 200,
        msg: 'success',
        data: { taskId: 'task_123' },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const client = new KieClient();
      await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(body.input.aspect_ratio).toBe('3:4');
    });

    it('uses resolution 2K for high quality output', async () => {
      const mockResponse: KieJobResponse = {
        code: 200,
        msg: 'success',
        data: { taskId: 'task_123' },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const client = new KieClient();
      await client.createPreviewTask(photoUrl, stylePrompt, callbackUrl);

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(body.input.resolution).toBe('2K');
    });
  });
});
