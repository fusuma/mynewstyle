/**
 * WebView Detection Utility
 *
 * Detects in-app browsers (Instagram, Facebook, TikTok, etc.)
 * that may restrict camera access or show repeated permission prompts.
 */

/** Known in-app browser user-agent signatures */
const IN_APP_BROWSER_PATTERNS = [
  /Instagram/i,
  /FBAN/i,
  /FBAV/i,
  /TikTok/i,
  /BytedanceWebview/i,
  /Twitter/i,
  /Line\//i,
  /Snapchat/i,
];

/**
 * Checks if the current browser is an in-app browser (WebView).
 * These browsers often restrict camera access via getUserMedia.
 *
 * @returns true if running inside an in-app browser
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua));
}

/**
 * Generates a URL to open in the device's native browser.
 * Falls back to current page URL if no custom URL provided.
 *
 * @param url - Optional custom URL. Defaults to current page URL.
 * @returns The URL string to use for opening in external browser.
 */
export function getExternalBrowserUrl(url?: string): string {
  if (url) return url;
  if (typeof window !== "undefined") return window.location.href;
  return "";
}
