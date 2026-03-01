import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isInAppBrowser, getExternalBrowserUrl } from "@/lib/photo/detect-webview";

describe("isInAppBrowser", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      value: ua,
      writable: true,
      configurable: true,
    });
  }

  it("detects Instagram in-app browser", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 275.0.0.12.98"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects Facebook in-app browser via FBAN", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20A362 [FBAN/FBIOS;FBDV/iPhone14,2]"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects Facebook in-app browser via FBAV", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.127 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/375.0.0.23.107;]"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects TikTok in-app browser", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TikTok 27.7.0"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects BytedanceWebview (TikTok variant)", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects Twitter in-app browser", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20A362 Twitter for iPhone"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects LINE in-app browser", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20A362 Line/12.16.0"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("detects Snapchat in-app browser", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20A362 Snapchat/12.0"
    );
    expect(isInAppBrowser()).toBe(true);
  });

  it("returns false for regular Chrome browser", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.135 Mobile Safari/537.36"
    );
    expect(isInAppBrowser()).toBe(false);
  });

  it("returns false for regular Safari browser", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1"
    );
    expect(isInAppBrowser()).toBe(false);
  });

  it("returns false for regular Firefox browser", () => {
    setUserAgent(
      "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/112.0 Firefox/112.0"
    );
    expect(isInAppBrowser()).toBe(false);
  });

  it("returns false for desktop Chrome", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
    );
    expect(isInAppBrowser()).toBe(false);
  });
});

describe("getExternalBrowserUrl", () => {
  it("returns the current page URL by default", () => {
    const url = getExternalBrowserUrl();
    expect(url).toBe(window.location.href);
  });

  it("returns a custom URL when provided", () => {
    const customUrl = "https://mynewstyle.com/consultation/photo";
    const url = getExternalBrowserUrl(customUrl);
    expect(url).toBe(customUrl);
  });
});
