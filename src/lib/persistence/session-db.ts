/**
 * IndexedDB persistence utility for consultation session recovery.
 *
 * Stores photo blob + metadata so users can resume their consultation
 * flow after app switching, memory pressure, or accidental navigation.
 *
 * All operations are best-effort: errors are caught silently and
 * never surface to the user. This is a convenience feature with
 * graceful degradation to "no recovery available."
 */

const DB_NAME = "mynewstyle-session";
const DB_VERSION = 1;
const STORE_NAME = "consultation-session";
const SESSION_KEY = "current";
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionData {
  photo: Blob;
  photoPreview: string; // base64 data URL for immediate display
  gender: "male" | "female";
  guestSessionId: string;
  consultationId: string;
  uploadResult?: {
    success: boolean;
    signedUrl?: string;
    storagePath?: string;
  };
  savedAt: number; // Date.now() timestamp
}

/**
 * Open (or create) the IndexedDB database for session persistence.
 */
function openSessionDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save session data (photo blob + metadata) to IndexedDB.
 * Silently fails on write error -- persistence is best-effort.
 */
export async function saveSessionData(data: SessionData): Promise<void> {
  try {
    const db = await openSessionDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(data, SESSION_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail -- persistence is best-effort
    console.warn("Failed to save session data to IndexedDB");
  }
}

/**
 * Load session data from IndexedDB.
 * Returns null if: no data, expired (>24h), corrupted blob, or any error.
 */
export async function loadSessionData(): Promise<SessionData | null> {
  try {
    const db = await openSessionDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(SESSION_KEY);
    const data = await new Promise<SessionData | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!data) return null;

    // Expiry check: clear and return null if older than 24 hours
    if (Date.now() - data.savedAt > SESSION_EXPIRY_MS) {
      await clearSessionData();
      return null;
    }

    // Validate photo blob is readable (not corrupted)
    if (!(data.photo instanceof Blob) || data.photo.size === 0) {
      await clearSessionData();
      return null;
    }

    // Validate required metadata fields are present
    if (
      typeof data.guestSessionId !== "string" ||
      typeof data.consultationId !== "string" ||
      typeof data.gender !== "string" ||
      typeof data.photoPreview !== "string"
    ) {
      await clearSessionData();
      return null;
    }

    return data;
  } catch {
    // IndexedDB unavailable or corrupted -- graceful degradation
    console.warn("Failed to load session data from IndexedDB");
    return null;
  }
}

/**
 * Clear all session data from IndexedDB.
 */
export async function clearSessionData(): Promise<void> {
  try {
    const db = await openSessionDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(SESSION_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    console.warn("Failed to clear session data from IndexedDB");
  }
}
