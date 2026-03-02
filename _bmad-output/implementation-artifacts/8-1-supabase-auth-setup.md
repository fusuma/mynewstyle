# Story 8.1: Supabase Auth Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **auth configured with email/password and Google OAuth via Supabase Auth**,
so that **users can register, log in, and maintain authenticated sessions that persist across the application, enabling profile, history, and guest migration features in subsequent stories**.

## Acceptance Criteria

1. Supabase Auth is configured with email/password authentication provider enabled
2. Google OAuth provider is configured and functional (redirect flow works end-to-end)
3. JWT sessions have 24-hour expiry with automatic refresh (token refresh handled transparently)
4. Auth state is managed via the Supabase SSR client pattern (`@supabase/ssr`) with proper cookie-based session handling
5. Browser client (`createBrowserClient`) is available for client components
6. Server client (`createServerClient`) is available for Server Components, Server Actions, and Route Handlers
7. Next.js middleware refreshes auth tokens on every request and passes session to server components via cookies
8. Auth callback route (`/auth/callback`) handles OAuth redirect and code exchange
9. `profiles` table is created in Supabase with RLS policies (users read/update own profile only)
10. A database trigger automatically creates a profile row when a new user registers via `auth.users`
11. Environment variables for Google OAuth are documented in `.env.example`
12. All existing functionality (consultation flow, payment, previews) continues to work without regressions (auth is additive, not required yet)

## Tasks / Subtasks

- [x] Task 1: Install `@supabase/ssr` package (AC: 4, 5, 6)
  - [x] 1.1 Run `npm install @supabase/ssr`
  - [x] 1.2 Verify compatibility with `@supabase/supabase-js@^2.98.0` and Next.js 16

- [x] Task 2: Refactor Supabase browser client to use `@supabase/ssr` (AC: 4, 5, 12)
  - [x] 2.1 Update `src/lib/supabase/client.ts` to use `createBrowserClient` from `@supabase/ssr` instead of `createClient` from `@supabase/supabase-js`
  - [x] 2.2 Export a `createClient()` function (not a singleton) so each component call gets a fresh client with cookie access
  - [x] 2.3 Verify all existing code that imports from `src/lib/supabase/client.ts` still works (grep for all imports)
  - [x] 2.4 The existing `supabase` singleton export should be replaced with the `createClient()` function -- update all call sites

- [x] Task 3: Create Supabase server client using `@supabase/ssr` (AC: 6)
  - [x] 3.1 Update `src/lib/supabase/server.ts` to export a `createServerClient` function using `@supabase/ssr`'s `createServerClient`
  - [x] 3.2 The server client must use `cookies()` from `next/headers` for cookie-based session management
  - [x] 3.3 Keep the existing `createServerSupabaseClient()` function that uses the service role key (rename to clarify: `createServiceRoleClient`)
  - [x] 3.4 New `createClient()` export uses the anon key + cookies (for user-scoped operations with RLS)
  - [x] 3.5 Update existing API routes that use `createServerSupabaseClient()` to import from the updated path (backward-compatible)

- [x] Task 4: Create Next.js middleware for auth token refresh (AC: 7)
  - [x] 4.1 Create `src/middleware.ts` (Next.js middleware file)
  - [x] 4.2 Use `createServerClient` from `@supabase/ssr` with request/response cookie handlers
  - [x] 4.3 Call `supabase.auth.getUser()` to refresh the session token
  - [x] 4.4 Pass updated cookies from request to response (required for server components to see the refreshed session)
  - [x] 4.5 Configure matcher to exclude static assets (`_next/static`, `_next/image`, `favicon.ico`) and public API routes that don't need auth
  - [x] 4.6 Middleware must NOT block any existing routes -- auth is additive (no redirects to login yet)

- [x] Task 5: Create auth callback route for OAuth (AC: 2, 8)
  - [x] 5.1 Create `src/app/auth/callback/route.ts` (GET handler)
  - [x] 5.2 Extract `code` from URL search params
  - [x] 5.3 Exchange code for session using `supabase.auth.exchangeCodeForSession(code)`
  - [x] 5.4 Redirect to `/profile` on success (or configurable `next` param)
  - [x] 5.5 Redirect to `/login?error=auth_callback_failed` on failure
  - [x] 5.6 Handle edge case: no `code` param in URL (redirect to `/login`)

- [x] Task 6: Create `profiles` table and RLS policies (AC: 9, 10)
  - [x] 6.1 Create SQL migration file: `src/lib/supabase/schema/profiles.sql`
  - [x] 6.2 Create `profiles` table with columns: `id` (uuid, PK, FK to auth.users), `display_name` (text, nullable), `gender_preference` (text, nullable, check constraint: 'male'/'female'/null), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
  - [x] 6.3 Enable RLS on `profiles` table
  - [x] 6.4 Create RLS policy: "Users read own profile" -- `FOR SELECT USING (auth.uid() = id)`
  - [x] 6.5 Create RLS policy: "Users update own profile" -- `FOR UPDATE USING (auth.uid() = id)`
  - [x] 6.6 Create RLS policy: "Users insert own profile" -- `FOR INSERT WITH CHECK (auth.uid() = id)` (needed for trigger fallback)
  - [x] 6.7 REVOKE ALL ON profiles FROM anon, authenticated (then GRANT SELECT, UPDATE, INSERT to authenticated) -- per SOSLeiria pattern
  - [x] 6.8 Create trigger function `handle_new_user()` that inserts a profile row on `auth.users` INSERT
  - [x] 6.9 Create trigger `on_auth_user_created` on `auth.users` AFTER INSERT that calls `handle_new_user()`
  - [x] 6.10 Create `updated_at` trigger to auto-set `updated_at` on profile UPDATE

- [x] Task 7: Configure Google OAuth in Supabase (AC: 2, 11)
  - [x] 7.1 Document required Google Cloud Console setup in a comment block in the callback route
  - [x] 7.2 Add to `.env.example`: `SUPABASE_AUTH_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` (these are configured in Supabase Dashboard, not in the app env directly)
  - [x] 7.3 Document the Supabase Dashboard configuration: Authentication > Providers > Google > enable, paste Client ID and Secret
  - [x] 7.4 Document the redirect URL format: `https://<project-ref>.supabase.co/auth/v1/callback`
  - [x] 7.5 Ensure the callback route at `/auth/callback` handles the PKCE flow redirect from Supabase

- [x] Task 8: Create auth utility hooks (AC: 3, 4)
  - [x] 8.1 Create `src/hooks/useAuth.ts` -- a client-side hook that provides auth state
  - [x] 8.2 Hook returns: `{ user, session, isLoading, signOut }` using `supabase.auth.getUser()` and `supabase.auth.onAuthStateChange()`
  - [x] 8.3 `signOut` calls `supabase.auth.signOut()` and redirects to landing page
  - [x] 8.4 Subscribe to `onAuthStateChange` for real-time auth state updates (login/logout in other tabs)
  - [x] 8.5 Cleanup subscription on unmount

- [x] Task 9: Add TypeScript types for auth (AC: 4)
  - [x] 9.1 Add `UserProfile` interface to `src/types/index.ts`: `{ id: string, displayName: string | null, genderPreference: 'male' | 'female' | null, createdAt: string, updatedAt: string }`
  - [x] 9.2 Add `AuthState` interface: `{ user: User | null, session: Session | null, isLoading: boolean }`
  - [x] 9.3 Import `User` and `Session` types from `@supabase/supabase-js`

- [x] Task 10: Update `.env.example` with auth-related variables (AC: 11)
  - [x] 10.1 Add comment section for Google OAuth configuration
  - [x] 10.2 Add `NEXT_PUBLIC_SITE_URL` variable (needed for auth redirect URLs)
  - [x] 10.3 Document that Google OAuth Client ID/Secret are configured in Supabase Dashboard, not as app env vars

- [x] Task 11: Write tests (AC: 1-12)
  - [x] 11.1 Unit test: `createClient()` from browser client returns a valid Supabase client instance
  - [x] 11.2 Unit test: `createClient()` from server client creates a client with cookie handling
  - [x] 11.3 Unit test: Auth callback route exchanges code for session and redirects
  - [x] 11.4 Unit test: Auth callback route handles missing code gracefully
  - [x] 11.5 Unit test: `useAuth` hook returns loading state initially, then user/session
  - [x] 11.6 Unit test: `useAuth` hook handles sign-out correctly
  - [x] 11.7 Unit test: Middleware refreshes session and passes cookies
  - [x] 11.8 Integration test: Existing consultation API routes still work (no auth regression)
  - [x] 11.9 SQL validation: profiles table has RLS enabled with correct policies

## Dev Notes

### Architecture Patterns and Constraints

- **Framework:** Next.js 16 App Router with React 19. Client components use `'use client'` directive.
- **State management:** Zustand with sessionStorage persistence (`stores/consultation.ts`) -- auth state should NOT be stored in Zustand. Use Supabase's own session management via cookies.
- **UI components:** shadcn/ui from `@/components/ui/`
- **Styling:** Tailwind CSS v4 with design system tokens
- **Testing:** Vitest + React Testing Library. Tests in `src/test/` directory.
- **Current Supabase version:** `@supabase/supabase-js@^2.98.0`

### Critical: @supabase/ssr Package Pattern (NOT Auth Helpers)

The old `@supabase/auth-helpers-nextjs` package is deprecated. This project MUST use `@supabase/ssr` which is the official replacement. Key differences:

1. **Browser client:** `createBrowserClient(url, key)` from `@supabase/ssr` -- replaces `createClient` from `@supabase/supabase-js` for client-side usage
2. **Server client:** `createServerClient(url, key, { cookies })` from `@supabase/ssr` -- requires explicit cookie handlers using `next/headers`
3. **Middleware:** Uses `createServerClient` with request/response cookie objects to refresh tokens
4. **No more singleton client:** Each function call should create a fresh client (important for SSR)

### Refactoring the Existing Supabase Client

The current `src/lib/supabase/client.ts` exports a singleton:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

This MUST be changed to a factory function:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**All existing call sites** that use `import { supabase } from '@/lib/supabase/client'` must be updated to `import { createClient } from '@/lib/supabase/client'` then call `const supabase = createClient()`. Grep for all usages before refactoring.

### Server Client Architecture

The project currently has TWO server-side client needs:
1. **Service role client** (bypasses RLS) -- used by API routes that need admin access (e.g., webhook handlers, AI cost tracking). Keep this as `createServiceRoleClient()`.
2. **User-scoped server client** (respects RLS) -- NEW, needed for auth-aware server operations. Uses `@supabase/ssr`'s `createServerClient` with cookies.

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// User-scoped client (respects RLS, reads auth from cookies)
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

// Admin client (bypasses RLS, for server-side admin operations)
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Middleware Configuration

The middleware MUST:
1. Refresh expired auth tokens on every request
2. Pass updated cookies to server components
3. NOT block or redirect any existing routes (auth is additive in this story)
4. Exclude static assets from processing

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session -- IMPORTANT: don't use getSession() as it reads from storage
  // getUser() validates the token against the Supabase Auth server
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Auth Callback Route

```typescript
// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/profile'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

### Profiles Table Schema

Follows architecture doc Section 3.1 exactly:

```sql
-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  gender_preference TEXT CHECK (gender_preference IN ('male', 'female') OR gender_preference IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- REVOKE default grants (SOSLeiria lesson -- architecture doc Section 3.2)
REVOKE ALL ON profiles FROM anon, authenticated;

-- Grant only what's needed
GRANT SELECT, UPDATE, INSERT ON profiles TO authenticated;

-- Policies
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Google OAuth Configuration

Google OAuth requires configuration in TWO places:
1. **Google Cloud Console:** Create OAuth 2.0 credentials (Client ID + Client Secret). Set the authorized redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard:** Authentication > Providers > Google > Enable > paste Client ID and Client Secret.

The app code does NOT need Google OAuth env vars directly -- Supabase handles the entire OAuth dance server-side. The app only needs:
- A button that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${window.location.origin}/auth/callback' } })`
- The `/auth/callback` route to exchange the code for a session

### useAuth Hook Pattern

```typescript
// src/hooks/useAuth.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return { user, session, isLoading, signOut }
}
```

### Critical: No Breaking Changes to Existing Flow

This story is purely ADDITIVE. The entire consultation flow (photo, questionnaire, processing, payment, results, previews) MUST continue to work identically for unauthenticated/guest users. Auth is infrastructure setup only -- no routes are protected, no login gates are added.

Specifically:
- The middleware must NOT redirect unauthenticated users anywhere
- All existing API routes must continue to function (they use the service role client, unaffected)
- The consultation Zustand store is NOT modified
- No UI changes to existing pages

### Existing Files to Modify

- **`src/lib/supabase/client.ts`** -- Refactor singleton to factory function using `@supabase/ssr`
- **`src/lib/supabase/server.ts`** -- Add user-scoped server client, rename existing to `createServiceRoleClient`
- **`src/types/index.ts`** -- Add `UserProfile` and `AuthState` types
- **`.env.example`** -- Add Google OAuth documentation and `NEXT_PUBLIC_SITE_URL`
- **All files importing `{ supabase }` from `@/lib/supabase/client`** -- Update to use `createClient()` function call

### New Files to Create

- `src/middleware.ts` -- Next.js middleware for auth token refresh
- `src/app/auth/callback/route.ts` -- OAuth callback handler
- `src/hooks/useAuth.ts` -- Client-side auth state hook
- `src/lib/supabase/schema/profiles.sql` -- Profiles table migration

### Project Structure Notes

- Alignment with unified project structure: all Supabase files remain in `src/lib/supabase/`, auth route at `src/app/auth/callback/`, hooks in `src/hooks/`
- The existing `src/lib/supabase/schema/` directory already has SQL files (`ai-calls.sql`, `consultation-hash-columns.sql`) -- `profiles.sql` follows this pattern
- No conflicts detected with existing components or routes

### Testing Standards

- Test files in `src/test/` directory
- Use Vitest + React Testing Library
- Mock `@supabase/ssr` functions in tests
- Mock `next/headers` cookies() for server client tests
- Mock `NextRequest`/`NextResponse` for middleware tests
- Test the auth callback route with both success and error cases
- Verify no regression in existing API routes by running the full test suite
- All 1558+ existing tests must continue to pass

### Dependencies on Other Stories

- **None** -- This is the first story in Epic 8. It is infrastructure-only.
- **Depended on by:** S8.2 (Registration Page), S8.3 (Login Page), S8.4 (Guest Session Management), S8.5 (Guest-to-Auth Migration), S8.6 (User Profile & History)
- **Cross-epic dependency:** S11.2 (Consent Flow) will add consent fields to the registration flow built on this auth setup

### Previous Epic Intelligence (Epic 7)

Key patterns established in Epic 7 that apply here:
- **Client component pattern:** Use `'use client'` directive, import from `@/lib/` and `@/hooks/`
- **Zustand store access:** Read from store using selectors (`useConsultationStore((state) => state.field)`)
- **Toast notifications:** Use `toast.error()` / `toast.success()` from `sonner` for user feedback
- **Test patterns:** Mock external dependencies, use `vi.mock()`, test both success and error paths
- **CORS/cookie awareness:** The switch to cookie-based auth is important -- ensure Supabase cookies are properly handled in the same-origin context

### Git Intelligence

Recent commit pattern: `feat(epic-N): implement story N-M-story-name`. Follow this convention.
All 7 stories in Epic 7 were implemented successfully. No outstanding regressions.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S8.1] -- Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 2.2] -- Supabase Auth: email/password + Google OAuth, JWT sessions
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.1] -- profiles table schema with id, display_name, gender_preference, created_at, updated_at
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.2] -- RLS policies for profiles, REVOKE ALL before GRANT pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.3] -- Auth API routes: register, login, google, session, claim-guest
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1] -- Project structure: lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/types.ts
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.1] -- JWT 24h expiry, auto-refresh, Google OAuth 2.0, guest sessions
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.3] -- API security: Zod schemas, rate limiting, CORS
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 12] -- SOSLeiria lesson: REVOKE ALL before GRANT
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 13] -- Top 10: REVOKE ALL before GRANT, RLS audit
- [Source: _bmad-output/planning-artifacts/prd.md#FR1-FR2] -- Users register with email/password or Google OAuth, maintain authenticated sessions
- [Source: _bmad-output/planning-artifacts/prd.md#NFR8] -- JWT tokens expire after 24 hours of inactivity
- [Source: _bmad-output/planning-artifacts/prd.md#NFR21] -- Google OAuth standard OAuth 2.0 flow
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 2.3] -- Guest vs Auth flow: guest completes ONE consultation, auth for history/favorites
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.9] -- Auth screens: Login (email/password + Google), Register (name, email, password + Google + LGPD consent)
- [Source: src/lib/supabase/client.ts] -- Current browser client (singleton, needs refactoring)
- [Source: src/lib/supabase/server.ts] -- Current server client (service role only, needs user-scoped addition)
- [Source: src/stores/consultation.ts] -- Zustand store (NOT to be modified in this story)
- [Source: src/types/index.ts] -- Shared TypeScript types (add UserProfile, AuthState)
- [Source: .env.example] -- Current environment variables (add Google OAuth docs)
- [Source: _bmad-output/implementation-artifacts/7-7-barber-reference-card.md] -- Previous story patterns, testing approach

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Task 2.3/2.4: Only one file used the old `supabase` singleton from browser client: `src/lib/photo/upload.ts`. Updated to use `createClient()` factory pattern. All existing API routes use `createServerSupabaseClient()` from server client, which was kept as a backward-compatible alias for `createServiceRoleClient()`.
- Task 3.5: Existing API routes continue importing `createServerSupabaseClient()` without any code changes required -- the function is preserved as a deprecated alias in `server.ts`.
- Tests: Fixed `vi.hoisted()` pattern required for Vitest when mock factory references variables declared outside the factory.
- Task 11.8 (integration test): Verified by running the full test suite -- all 1558 existing tests pass alongside the 20 new auth tests (1578 total).
- Task 11.9 (SQL validation): Validated via code review of `profiles.sql` -- RLS is enabled, REVOKE ALL before GRANT pattern is followed, all three policies (SELECT, UPDATE, INSERT) are present, triggers for auto-profile-creation and updated_at are included.

### Completion Notes List

- Installed `@supabase/ssr@0.9.0` -- compatible with `@supabase/supabase-js@^2.98.0` and Next.js 16.
- Refactored `src/lib/supabase/client.ts` from singleton export to `createClient()` factory using `createBrowserClient` from `@supabase/ssr`.
- Updated `src/lib/supabase/server.ts` to export both `createClient()` (user-scoped, uses anon key + cookies) and `createServiceRoleClient()` (admin, bypasses RLS). Kept `createServerSupabaseClient()` as deprecated alias for backward compatibility -- no existing API routes required modification.
- Updated `src/lib/photo/upload.ts` to use `createClient()` factory instead of the old `supabase` singleton.
- Created `src/middleware.ts` -- refreshes auth tokens on every request via `getUser()`, does not redirect unauthenticated users.
- Created `src/app/auth/callback/route.ts` -- handles PKCE OAuth code exchange, redirects to `/profile` on success or `/login?error=auth_callback_failed` on failure.
- Created `src/hooks/useAuth.ts` -- `useAuth()` hook provides `{ user, session, isLoading, signOut }`, subscribes to auth state changes, cleans up on unmount.
- Created `src/lib/supabase/schema/profiles.sql` -- full profiles table with RLS, SOSLeiria REVOKE ALL pattern, auto-create trigger, updated_at trigger.
- Added `UserProfile` and `AuthState` interfaces to `src/types/index.ts`, re-exported `User` and `Session` from `@supabase/supabase-js`.
- Updated `.env.example` with `NEXT_PUBLIC_SITE_URL` and detailed Google OAuth configuration documentation.
- All 20 new tests pass. Full regression suite: 1578 tests pass (0 failures).

### File List

New files created:
- src/middleware.ts
- src/app/auth/callback/route.ts
- src/hooks/useAuth.ts
- src/lib/supabase/schema/profiles.sql
- src/test/supabase-browser-client.test.ts
- src/test/supabase-server-client.test.ts
- src/test/auth-callback-route.test.ts
- src/test/use-auth.test.ts
- src/test/auth-middleware.test.ts

Modified files:
- src/lib/supabase/client.ts
- src/lib/supabase/server.ts
- src/lib/photo/upload.ts
- src/types/index.ts
- .env.example
- src/test/photo-upload-util.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/8-1-supabase-auth-setup.md

## Senior Developer Review (AI)

**Reviewer:** Fusuma on 2026-03-02
**Outcome:** Approved with fixes applied

### Issues Found and Fixed

#### CRITICAL

1. **Open Redirect in `/auth/callback/route.ts`** [FIXED]
   - The `next` URL param was accepted and redirected to without validation. An attacker could craft `?next=https://evil.com` or `?next=//evil.com` (protocol-relative) to redirect users after OAuth login.
   - Fix: Added path sanitization — only relative paths starting with exactly one `/` (not `//`) are accepted; falls back to `/profile` otherwise.
   - Tests added: two new open-redirect security tests in `auth-callback-route.test.ts`.

2. **`useAuth.ts` `getUser()` error not handled — permanent loading state** [FIXED]
   - `getUser().then(...)` only handled the success branch. Any network error or expired token failure would leave `isLoading` as `true` permanently, freezing any component depending on auth state.
   - Fix: Destructured `error` from the result and always calls `setIsLoading(false)`.
   - Test added: "sets isLoading=false even when getUser() returns an error" in `use-auth.test.ts`.

#### HIGH

3. **Two separate Supabase client instances in `useAuth.ts`** [FIXED]
   - `signOut()` created a fresh client disconnected from the subscription client. This could cause session management inconsistencies.
   - Fix: Introduced `useRef<SupabaseClient>` to share a single client instance between the effect and `signOut`.

4. **Missing `try/catch` in `src/middleware.ts` around `getUser()`** [FIXED]
   - A Supabase outage or network error would throw from middleware and crash the entire Next.js request pipeline, making the app completely unavailable.
   - Fix: Wrapped `await supabase.auth.getUser()` in a try/catch that silently continues on failure.
   - Test added: "continues serving request when getUser() throws a network error" in `auth-middleware.test.ts`.

#### MEDIUM

5. **`server.ts` `createClient()` `setAll` throws in Route Handler read-only cookie contexts** [FIXED]
   - Per the official Supabase SSR guide, `setAll` in Route Handlers where cookies are read-only must be wrapped in try/catch. Without this, any Route Handler using `createClient()` from `server.ts` would throw if Supabase tried to set a cookie.
   - Fix: Added try/catch around the `cookiesToSet.forEach` in `setAll` with an explanatory comment.
   - Test added: "setAll in createClient() cookie handler does not throw when cookieStore.set throws" in `supabase-server-client.test.ts`.

6. **SQL policies in `profiles.sql` not idempotent — `CREATE POLICY` without `IF NOT EXISTS`** [FIXED]
   - Re-running the migration (e.g., in CI reset or local dev teardown/recreate) would fail with "policy already exists" errors because PostgreSQL's `CREATE POLICY` does not support `IF NOT EXISTS`.
   - Fix: Wrapped each policy creation in `DO $$ BEGIN IF NOT EXISTS (...) THEN CREATE POLICY ... END IF; END $$;` blocks.

#### LOW

7. **Missing test for `createServerSupabaseClient()` backward-compat alias (Task 3.5)** [FIXED]
   - Story claims the alias was preserved and tested, but no test existed for it.
   - Fix: Added "createServerSupabaseClient() is a working alias for createServiceRoleClient()" test to `supabase-server-client.test.ts`.

### Final Test Results

- Total tests: **1584** (was 1578 before review)
- New tests added: **6** (security, resilience, and regression tests)
- All 114 test files pass with 0 failures.

### Change Log

- 2026-03-02: Implemented Story 8.1 - Supabase Auth Setup. Installed @supabase/ssr, refactored browser and server Supabase clients to SSR pattern, created Next.js middleware for token refresh, auth callback route for OAuth PKCE flow, useAuth hook, profiles SQL schema with RLS, TypeScript types, and comprehensive test suite.
- 2026-03-02: Code review by AI (claude-sonnet-4-6). Fixed: open redirect vulnerability in /auth/callback, permanent loading state bug in useAuth, dual Supabase client instance in useAuth, missing middleware error resilience, setAll throwing in read-only cookie contexts, non-idempotent SQL policies. Added 6 new security/resilience tests. Status → done.
