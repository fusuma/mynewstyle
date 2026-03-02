import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getDeviceInfo', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a DeviceInfo object with correct shape', async () => {
    // Set up browser environment
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(window, 'screen', {
      value: { width: 1920, height: 1080 },
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 1440,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info).toHaveProperty('browser');
    expect(info).toHaveProperty('browserVersion');
    expect(info).toHaveProperty('os');
    expect(info).toHaveProperty('osVersion');
    expect(info).toHaveProperty('screenWidth');
    expect(info).toHaveProperty('screenHeight');
    expect(info).toHaveProperty('viewportWidth');
    expect(info).toHaveProperty('viewportHeight');
    expect(info).toHaveProperty('isMobile');
  });

  it('detects Chrome browser on macOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.browser).toBe('Chrome');
    expect(info.browserVersion).toContain('120');
    expect(info.os).toBe('macOS');
  });

  it('detects Firefox browser on Windows', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.browser).toBe('Firefox');
    expect(info.os).toBe('Windows');
  });

  it('detects Safari on iOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.browser).toBe('Safari');
    expect(info.os).toBe('iOS');
    expect(info.isMobile).toBe(true);
  });

  it('returns isMobile=true when maxTouchPoints > 0', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 390,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.isMobile).toBe(true);
  });

  it('returns isMobile=true when viewport width < 768', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 AppleWebKit/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.isMobile).toBe(true);
  });

  it('returns isMobile=false on desktop', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 1440,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.isMobile).toBe(false);
  });

  it('returns correct screen dimensions', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(window, 'screen', {
      value: { width: 2560, height: 1440 },
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 1920,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 1080,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.screenWidth).toBe(2560);
    expect(info.screenHeight).toBe(1440);
    expect(info.viewportWidth).toBe(1920);
    expect(info.viewportHeight).toBe(1080);
  });

  it('returns empty defaults when window is undefined (SSR)', async () => {
    // Simulate SSR environment by patching window check
    const originalWindow = global.window;
    // @ts-expect-error simulating SSR
    delete global.window;

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info = getDeviceInfo();

    expect(info.browser).toBe('');
    expect(info.os).toBe('');
    expect(info.screenWidth).toBe(0);
    expect(info.isMobile).toBe(false);

    global.window = originalWindow;
  });

  it('caches result on subsequent calls', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });

    const { getDeviceInfo } = await import('@/lib/analytics/device-info');
    const info1 = getDeviceInfo();
    const info2 = getDeviceInfo();

    // Should return the same object reference (cached)
    expect(info1).toBe(info2);
  });
});
