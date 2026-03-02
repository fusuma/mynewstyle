/**
 * Device Info Collector — Analytics Event System
 * Story 10.1, Task 3
 *
 * Collects browser and device information for analytics events.
 * Does NOT add any new npm dependency — parses userAgent manually.
 * Result is cached after first call (device info doesn't change within a session).
 */

import type { DeviceInfo } from './types';

// Cache: computed once on first call
let cachedDeviceInfo: DeviceInfo | null = null;

/**
 * Parse browser name and version from userAgent string.
 */
function parseBrowser(ua: string): { browser: string; browserVersion: string } {
  // Order matters: check more specific patterns first

  // Edge (Chromium-based)
  const edgMatch = ua.match(/Edg\/(\d+[\d.]*)/);
  if (edgMatch) return { browser: 'Edge', browserVersion: edgMatch[1] };

  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+[\d.]*)/);
  if (firefoxMatch) return { browser: 'Firefox', browserVersion: firefoxMatch[1] };

  // Samsung Internet
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+[\d.]*)/);
  if (samsungMatch) return { browser: 'Samsung Internet', browserVersion: samsungMatch[1] };

  // Chrome / Chromium (must come before Safari check)
  const chromeMatch = ua.match(/Chrome\/(\d+[\d.]*)/);
  if (chromeMatch && !ua.includes('Chromium')) {
    return { browser: 'Chrome', browserVersion: chromeMatch[1] };
  }

  // Chromium
  const chromiumMatch = ua.match(/Chromium\/(\d+[\d.]*)/);
  if (chromiumMatch) return { browser: 'Chromium', browserVersion: chromiumMatch[1] };

  // Safari (must come after Chrome since Chrome UA includes Safari)
  const safariMatch = ua.match(/Version\/(\d+[\d.]*).*Safari/);
  if (safariMatch && !ua.includes('Chrome')) {
    return { browser: 'Safari', browserVersion: safariMatch[1] };
  }

  // Opera
  const operaMatch = ua.match(/OPR\/(\d+[\d.]*)/);
  if (operaMatch) return { browser: 'Opera', browserVersion: operaMatch[1] };

  // IE
  const ieMatch = ua.match(/Trident\/.*rv:(\d+[\d.]*)/);
  if (ieMatch) return { browser: 'IE', browserVersion: ieMatch[1] };

  return { browser: 'Unknown', browserVersion: '' };
}

/**
 * Parse OS name and version from userAgent string.
 */
function parseOS(ua: string): { os: string; osVersion: string } {
  // iOS (must check before macOS since iPad can report macOS-like UA)
  const iosMatch = ua.match(/(?:iPhone|iPad|iPod).*OS ([\d_]+)/);
  if (iosMatch) {
    return { os: 'iOS', osVersion: iosMatch[1].replace(/_/g, '.') };
  }

  // Android
  const androidMatch = ua.match(/Android ([\d.]+)/);
  if (androidMatch) return { os: 'Android', osVersion: androidMatch[1] };

  // macOS
  const macMatch = ua.match(/Mac OS X ([\d_]+)/);
  if (macMatch) {
    return { os: 'macOS', osVersion: macMatch[1].replace(/_/g, '.') };
  }

  // Windows
  const windowsMatch = ua.match(/Windows NT ([\d.]+)/);
  if (windowsMatch) {
    const versionMap: Record<string, string> = {
      '10.0': '10',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
    };
    return { os: 'Windows', osVersion: versionMap[windowsMatch[1]] ?? windowsMatch[1] };
  }

  // Linux
  if (ua.includes('Linux')) return { os: 'Linux', osVersion: '' };

  return { os: 'Unknown', osVersion: '' };
}

/**
 * Returns device info for the current browser session.
 * Computed once on first call and cached for subsequent calls.
 * Returns safe empty defaults in SSR (window is undefined).
 */
export function getDeviceInfo(): DeviceInfo {
  // Return cached result if available
  if (cachedDeviceInfo !== null) {
    return cachedDeviceInfo;
  }

  // SSR guard: return empty defaults when running server-side
  if (typeof window === 'undefined') {
    return {
      browser: '',
      browserVersion: '',
      os: '',
      osVersion: '',
      screenWidth: 0,
      screenHeight: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      isMobile: false,
    };
  }

  const ua = navigator.userAgent ?? '';
  const { browser, browserVersion } = parseBrowser(ua);
  const { os, osVersion } = parseOS(ua);

  const viewportWidth = window.innerWidth ?? 0;
  const isMobile = viewportWidth < 768 || (navigator.maxTouchPoints ?? 0) > 0;

  cachedDeviceInfo = {
    browser,
    browserVersion,
    os,
    osVersion,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    viewportWidth,
    viewportHeight: window.innerHeight ?? 0,
    isMobile,
  };

  return cachedDeviceInfo;
}

/**
 * Reset the cache (for testing purposes only).
 * @internal
 */
export function _resetDeviceInfoCache(): void {
  cachedDeviceInfo = null;
}
