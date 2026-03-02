import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAIConfig } from '../lib/ai/config';

describe('AI Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns both configs when both env vars present', () => {
    process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const config = getAIConfig();

    expect(config.gemini).toEqual({
      apiKey: 'test-gemini-key',
      model: 'gemini-2.5-flash',
    });
    expect(config.openai).toEqual({
      apiKey: 'test-openai-key',
      model: 'gpt-4o',
    });
  });

  it('returns null for gemini when GOOGLE_AI_API_KEY missing', () => {
    delete process.env.GOOGLE_AI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const config = getAIConfig();

    expect(config.gemini).toBeNull();
    expect(config.openai).not.toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('GOOGLE_AI_API_KEY')
    );
  });

  it('returns null for openai when OPENAI_API_KEY missing', () => {
    process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
    delete process.env.OPENAI_API_KEY;

    const config = getAIConfig();

    expect(config.gemini).not.toBeNull();
    expect(config.openai).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('OPENAI_API_KEY')
    );
  });

  it('returns both null and logs both warnings when both keys missing', () => {
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const config = getAIConfig();

    expect(config.gemini).toBeNull();
    expect(config.openai).toBeNull();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('uses default model values (gemini-2.5-flash and gpt-4o)', () => {
    process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const config = getAIConfig();

    expect(config.gemini!.model).toBe('gemini-2.5-flash');
    expect(config.openai!.model).toBe('gpt-4o');
  });
});
