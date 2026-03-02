/**
 * Client-side referral capture and localStorage management.
 *
 * AC #2: ref query parameter is preserved until consultation starts or session ends.
 * AC #3: Captured in localStorage (key: mynewstyle_ref), 30-day expiry, first-touch attribution.
 * AC #10: Works for both authenticated and guest users.
 */

const STORAGE_KEY = 'mynewstyle_ref';
const EXPIRY_DAYS = 30;

interface StoredReferral {
  code: string;
  capturedAt: string; // ISO date string
}

/**
 * Reads `ref` from the current URL search params and stores it in localStorage.
 * Does NOT overwrite existing attribution (first-touch wins).
 */
export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');

  // Ignore empty or missing ref params
  if (!ref || ref.trim() === '') return;

  // First-touch attribution: do not overwrite if already set
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try {
      const parsed: StoredReferral = JSON.parse(existing);
      if (parsed.code) return; // Already attributed — preserve first-touch
    } catch {
      // Malformed data — safe to overwrite
    }
  }

  const entry: StoredReferral = {
    code: ref.trim(),
    capturedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

/**
 * Reads the stored referral code from localStorage.
 * Returns null if not present, expired, or malformed.
 * Clears expired entries automatically.
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  let parsed: StoredReferral;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON — clear and return null
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  if (!parsed.code || !parsed.capturedAt) return null;

  // Check 30-day expiry
  const capturedAt = new Date(parsed.capturedAt).getTime();
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - capturedAt > expiryMs) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  return parsed.code;
}

/**
 * Removes the referral code from localStorage.
 * Called after a consultation is started (AC #2: persisted until consultation starts).
 */
export function clearReferralCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
