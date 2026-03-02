'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

/**
 * Client-side hook that provides auth state from Supabase.
 * Returns user, session, isLoading, and signOut.
 * Subscribes to auth state changes (login/logout in other tabs).
 * Cleans up subscription on component unmount.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use a single client instance for both the initial fetch and the subscription,
  // ensuring signOut() operates on the same client that holds the active session.
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    const supabase = supabaseRef.current!;

    // Get initial user (validates token against Supabase Auth server).
    // Handle errors gracefully so isLoading is always resolved.
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!error) {
        setUser(user);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabaseRef.current!.auth.signOut();
    window.location.href = '/';
  };

  return { user, session, isLoading, signOut };
}
