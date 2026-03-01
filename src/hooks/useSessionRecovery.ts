"use client";

import { useState, useEffect, useCallback } from "react";
import { loadSessionData, clearSessionData, type SessionData } from "@/lib/persistence/session-db";

/**
 * Hook for session recovery from IndexedDB.
 *
 * On mount, checks IndexedDB for a previously persisted consultation session.
 * If valid data is found, returns it so the page can display the recovered photo.
 *
 * All errors are handled gracefully -- if IndexedDB fails, the hook simply
 * returns null and the user starts a fresh session.
 */
export function useSessionRecovery() {
  const [recoveredSession, setRecoveredSession] = useState<SessionData | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSessionData()
      .then((data) => {
        if (!cancelled) {
          setRecoveredSession(data);
          setIsChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearRecovery = useCallback(async () => {
    await clearSessionData();
    setRecoveredSession(null);
  }, []);

  return { recoveredSession, isChecking, clearRecovery };
}
