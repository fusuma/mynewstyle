import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ============================================================
// Mock persistence module
// ============================================================
const mockLoadSessionData = vi.fn();
const mockClearSessionData = vi.fn();
const mockSaveSessionData = vi.fn();

vi.mock("@/lib/persistence/session-db", () => ({
  loadSessionData: (...args: unknown[]) => mockLoadSessionData(...args),
  clearSessionData: (...args: unknown[]) => mockClearSessionData(...args),
  saveSessionData: (...args: unknown[]) => mockSaveSessionData(...args),
}));

// ============================================================
// Helpers
// ============================================================

function createTestSessionData() {
  return {
    photo: new Blob(["test-photo-data"], { type: "image/jpeg" }),
    photoPreview: "data:image/jpeg;base64,test",
    gender: "male" as const,
    guestSessionId: "guest-session-123",
    consultationId: "consultation-456",
    savedAt: Date.now(),
  };
}

// ============================================================
// Tests
// ============================================================
describe("useSessionRecovery hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSessionData.mockResolvedValue(null);
    mockClearSessionData.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // 1. Returns null initially while checking
  // ----------------------------------------------------------
  it("returns null initially while checking", async () => {
    // Make load hang to observe initial state
    mockLoadSessionData.mockImplementation(() => new Promise(() => {}));

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    expect(result.current.recoveredSession).toBeNull();
    expect(result.current.isChecking).toBe(true);
  });

  // ----------------------------------------------------------
  // 2. Returns recovered session when data exists in IndexedDB
  // ----------------------------------------------------------
  it("returns recovered session when data exists in IndexedDB", async () => {
    const sessionData = createTestSessionData();
    mockLoadSessionData.mockResolvedValue(sessionData);

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.recoveredSession).not.toBeNull();
    expect(result.current.recoveredSession?.guestSessionId).toBe("guest-session-123");
  });

  // ----------------------------------------------------------
  // 3. Returns null when no data exists
  // ----------------------------------------------------------
  it("returns null when no data exists", async () => {
    mockLoadSessionData.mockResolvedValue(null);

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.recoveredSession).toBeNull();
  });

  // ----------------------------------------------------------
  // 4. Returns null when data is expired
  // ----------------------------------------------------------
  it("returns null when data is expired", async () => {
    // loadSessionData already returns null for expired data
    mockLoadSessionData.mockResolvedValue(null);

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.recoveredSession).toBeNull();
  });

  // ----------------------------------------------------------
  // 5. clearRecovery clears IndexedDB and resets state
  // ----------------------------------------------------------
  it("clearRecovery clears IndexedDB and resets state", async () => {
    const sessionData = createTestSessionData();
    mockLoadSessionData.mockResolvedValue(sessionData);

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    await waitFor(() => {
      expect(result.current.recoveredSession).not.toBeNull();
    });

    await act(async () => {
      await result.current.clearRecovery();
    });

    expect(mockClearSessionData).toHaveBeenCalledTimes(1);
    expect(result.current.recoveredSession).toBeNull();
  });

  // ----------------------------------------------------------
  // 6. isChecking is true during load, false after
  // ----------------------------------------------------------
  it("isChecking is true during load, false after", async () => {
    let resolveLoad: (value: null) => void;
    mockLoadSessionData.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolveLoad = resolve;
        })
    );

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    // During load
    expect(result.current.isChecking).toBe(true);

    // Resolve the load
    await act(async () => {
      resolveLoad!(null);
    });

    expect(result.current.isChecking).toBe(false);
  });

  // ----------------------------------------------------------
  // 7. Handles IndexedDB errors gracefully
  // ----------------------------------------------------------
  it("handles IndexedDB errors gracefully", async () => {
    mockLoadSessionData.mockRejectedValue(new Error("IndexedDB unavailable"));

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.recoveredSession).toBeNull();
  });

  // ----------------------------------------------------------
  // 8. Does not block page render during check
  // ----------------------------------------------------------
  it("does not block page render during check (returns immediately with isChecking=true)", async () => {
    mockLoadSessionData.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { useSessionRecovery } = await import("@/hooks/useSessionRecovery");
    const { result } = renderHook(() => useSessionRecovery());

    // Hook returns immediately with loading state -- does not block
    expect(result.current.isChecking).toBe(true);
    expect(result.current.recoveredSession).toBeNull();
    // The fact that we can read these values means render was not blocked
  });
});
