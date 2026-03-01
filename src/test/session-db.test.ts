import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================
// IndexedDB Mock Infrastructure
// ============================================================

interface MockStore {
  data: Map<string, unknown>;
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockTransaction {
  objectStore: ReturnType<typeof vi.fn>;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  error: Error | null;
}

interface MockDB {
  transaction: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  objectStoreNames: { contains: ReturnType<typeof vi.fn> };
  createObjectStore: ReturnType<typeof vi.fn>;
}

let mockStore: MockStore;
let mockTransaction: MockTransaction;
let mockDB: MockDB;
let mockOpenRequest: {
  result: MockDB;
  error: Error | null;
  onsuccess: ((e?: unknown) => void) | null;
  onerror: ((e?: unknown) => void) | null;
  onupgradeneeded: ((e?: unknown) => void) | null;
};

function createMockStore(): MockStore {
  const data = new Map<string, unknown>();
  return {
    data,
    put: vi.fn((value: unknown, key: string) => {
      data.set(key, value);
      const req = {
        result: undefined,
        error: null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
    get: vi.fn((key: string) => {
      const req = {
        result: data.get(key) ?? undefined,
        error: null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
    delete: vi.fn((key: string) => {
      data.delete(key);
      const req = {
        result: undefined,
        error: null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    }),
  };
}

function createMockTransaction(store: MockStore): MockTransaction {
  const tx: MockTransaction = {
    objectStore: vi.fn().mockReturnValue(store),
    oncomplete: null,
    onerror: null,
    error: null,
  };
  // Automatically complete the transaction after a tick
  setTimeout(() => tx.oncomplete?.(), 0);
  return tx;
}

function createMockDB(store: MockStore): MockDB {
  return {
    transaction: vi.fn((_storeName: string, _mode?: string) => {
      mockTransaction = createMockTransaction(store);
      return mockTransaction;
    }),
    close: vi.fn(),
    objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
    createObjectStore: vi.fn(),
  };
}

function setupIndexedDBMock(options?: {
  openFails?: boolean;
  writeFails?: boolean;
  readFails?: boolean;
}) {
  mockStore = createMockStore();
  mockDB = createMockDB(mockStore);

  mockOpenRequest = {
    result: mockDB,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };

  const mockOpen = vi.fn().mockImplementation(() => {
    if (options?.openFails) {
      setTimeout(() => {
        mockOpenRequest.error = new Error("IndexedDB open failed");
        mockOpenRequest.onerror?.();
      }, 0);
    } else {
      setTimeout(() => {
        mockOpenRequest.onsuccess?.();
      }, 0);
    }
    return mockOpenRequest;
  });

  if (options?.writeFails) {
    mockStore.put = vi.fn().mockImplementation(() => {
      const req = {
        result: undefined,
        error: new Error("Write failed"),
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => req.onerror?.(), 0);
      return req;
    });
    mockDB.transaction = vi.fn(() => {
      const tx = createMockTransaction(mockStore);
      // Override: make transaction fail
      setTimeout(() => {
        tx.error = new Error("Write failed");
        tx.onerror?.();
      }, 0);
      return tx;
    });
  }

  if (options?.readFails) {
    mockStore.get = vi.fn().mockImplementation(() => {
      const req = {
        result: undefined,
        error: new Error("Read failed"),
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => req.onerror?.(), 0);
      return req;
    });
    mockDB.transaction = vi.fn(() => {
      const tx = createMockTransaction(mockStore);
      setTimeout(() => {
        tx.error = new Error("Read failed");
        tx.onerror?.();
      }, 0);
      return tx;
    });
  }

  Object.defineProperty(globalThis, "indexedDB", {
    value: { open: mockOpen, deleteDatabase: vi.fn() },
    writable: true,
    configurable: true,
  });
}

function createTestSessionData(
  overrides?: Partial<{
    photo: Blob;
    photoPreview: string;
    gender: "male" | "female";
    guestSessionId: string;
    consultationId: string;
    savedAt: number;
  }>
) {
  return {
    photo: new Blob(["test-photo-data"], { type: "image/jpeg" }),
    photoPreview: "data:image/jpeg;base64,test",
    gender: "male" as const,
    guestSessionId: "guest-session-123",
    consultationId: "consultation-456",
    savedAt: Date.now(),
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================
describe("session-db: IndexedDB persistence utility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupIndexedDBMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // 1. Saves session data to IndexedDB successfully
  // ----------------------------------------------------------
  it("saves session data to IndexedDB successfully", async () => {
    const { saveSessionData } = await import("@/lib/persistence/session-db");
    const data = createTestSessionData();

    await expect(saveSessionData(data)).resolves.toBeUndefined();
    expect(mockStore.put).toHaveBeenCalledWith(data, "current");
  });

  // ----------------------------------------------------------
  // 2. Loads previously saved session data
  // ----------------------------------------------------------
  it("loads previously saved session data", async () => {
    const { saveSessionData, loadSessionData } = await import("@/lib/persistence/session-db");
    const data = createTestSessionData();

    await saveSessionData(data);

    // Re-setup mock to read from store that has data
    const result = await loadSessionData();
    expect(result).not.toBeNull();
    expect(result?.guestSessionId).toBe("guest-session-123");
    expect(result?.consultationId).toBe("consultation-456");
    expect(result?.gender).toBe("male");
  });

  // ----------------------------------------------------------
  // 3. Returns null when no session data exists
  // ----------------------------------------------------------
  it("returns null when no session data exists", async () => {
    const { loadSessionData } = await import("@/lib/persistence/session-db");
    const result = await loadSessionData();
    expect(result).toBeNull();
  });

  // ----------------------------------------------------------
  // 4. Returns null and clears data when session is older than 24 hours
  // ----------------------------------------------------------
  it("returns null and clears data when session is older than 24 hours", async () => {
    const { saveSessionData, loadSessionData, clearSessionData } =
      await import("@/lib/persistence/session-db");
    const expiredData = createTestSessionData({
      savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    });

    await saveSessionData(expiredData);

    const result = await loadSessionData();
    expect(result).toBeNull();
  });

  // ----------------------------------------------------------
  // 5. Clears session data successfully
  // ----------------------------------------------------------
  it("clears session data successfully", async () => {
    const { saveSessionData, clearSessionData, loadSessionData } =
      await import("@/lib/persistence/session-db");
    const data = createTestSessionData();

    await saveSessionData(data);
    await clearSessionData();

    const result = await loadSessionData();
    expect(result).toBeNull();
  });

  // ----------------------------------------------------------
  // 6. Handles IndexedDB open failure gracefully (returns null)
  // ----------------------------------------------------------
  it("handles IndexedDB open failure gracefully (returns null)", async () => {
    setupIndexedDBMock({ openFails: true });
    const { loadSessionData } = await import("@/lib/persistence/session-db");

    const result = await loadSessionData();
    expect(result).toBeNull();
  });

  // ----------------------------------------------------------
  // 7. Handles write failure gracefully (no throw)
  // ----------------------------------------------------------
  it("handles write failure gracefully (no throw)", async () => {
    setupIndexedDBMock({ writeFails: true });
    const { saveSessionData } = await import("@/lib/persistence/session-db");
    const data = createTestSessionData();

    // Should NOT throw
    await expect(saveSessionData(data)).resolves.toBeUndefined();
  });

  // ----------------------------------------------------------
  // 8. Handles corrupted data gracefully (returns null)
  // ----------------------------------------------------------
  it("handles corrupted data gracefully (returns null)", async () => {
    const { loadSessionData } = await import("@/lib/persistence/session-db");

    // Store corrupted data (empty blob)
    mockStore.data.set("current", {
      photo: new Blob([], { type: "image/jpeg" }), // size 0 - corrupted
      photoPreview: "data:image/jpeg;base64,test",
      gender: "male",
      guestSessionId: "guest-123",
      consultationId: "consult-456",
      savedAt: Date.now(),
    });

    const result = await loadSessionData();
    expect(result).toBeNull();
  });

  // ----------------------------------------------------------
  // 9. Stores photo blob with correct type
  // ----------------------------------------------------------
  it("stores photo blob with correct type", async () => {
    const { saveSessionData } = await import("@/lib/persistence/session-db");
    const photo = new Blob(["jpeg-photo-data"], { type: "image/jpeg" });
    const data = createTestSessionData({ photo });

    await saveSessionData(data);

    const stored = mockStore.data.get("current") as { photo: Blob };
    expect(stored.photo).toBeInstanceOf(Blob);
    expect(stored.photo.type).toBe("image/jpeg");
  });

  // ----------------------------------------------------------
  // 10. Stores all metadata fields
  // ----------------------------------------------------------
  it("stores all metadata fields (gender, guestSessionId, consultationId, savedAt)", async () => {
    const { saveSessionData } = await import("@/lib/persistence/session-db");
    const data = createTestSessionData({
      gender: "female",
      guestSessionId: "session-abc",
      consultationId: "consult-xyz",
      savedAt: 1700000000000,
    });

    await saveSessionData(data);

    const stored = mockStore.data.get("current") as Record<string, unknown>;
    expect(stored.gender).toBe("female");
    expect(stored.guestSessionId).toBe("session-abc");
    expect(stored.consultationId).toBe("consult-xyz");
    expect(stored.savedAt).toBe(1700000000000);
    expect(stored.photoPreview).toBe("data:image/jpeg;base64,test");
  });

  // ----------------------------------------------------------
  // 11. Overwrites previous session data on save
  // ----------------------------------------------------------
  it("overwrites previous session data on save", async () => {
    const { saveSessionData, loadSessionData } = await import("@/lib/persistence/session-db");

    const data1 = createTestSessionData({ consultationId: "first" });
    await saveSessionData(data1);

    const data2 = createTestSessionData({ consultationId: "second" });
    await saveSessionData(data2);

    const result = await loadSessionData();
    expect(result?.consultationId).toBe("second");
  });

  // ----------------------------------------------------------
  // 12. Auto-clears expired data on load
  // ----------------------------------------------------------
  it("auto-clears expired data on load", async () => {
    const { saveSessionData, loadSessionData } = await import("@/lib/persistence/session-db");
    const expiredData = createTestSessionData({
      savedAt: Date.now() - 25 * 60 * 60 * 1000,
    });

    await saveSessionData(expiredData);

    // First load returns null (expired)
    const result1 = await loadSessionData();
    expect(result1).toBeNull();

    // Data should be cleared from store
    // (clearSessionData was called internally on expired data)
    expect(mockStore.delete).toHaveBeenCalled();
  });
});
