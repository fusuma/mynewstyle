# Story 8.2: Registration Page

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to create an account with name, email/password or Google OAuth so I can save my consultations**,
so that **my consultation history is persisted across sessions and I can access it from any device**.

## Acceptance Criteria

1. Registration form includes name, email, and password fields with proper validation
2. Google OAuth button is displayed as the primary (most prominent) sign-up method
3. LGPD consent checkbox with text "Consinto o processamento dos meus dados" is required before submission
4. Link to privacy policy (/privacidade) is visible and functional near the consent checkbox
5. Gender-themed design is applied if the user has already selected a gender in the consultation flow (dark male theme or warm light female theme); otherwise neutral/default theme
6. Form validation provides real-time feedback: email format, password minimum length (8 chars), name required
7. Successful registration redirects to the profile page or pending consultation (if in-progress)
8. Registration errors (duplicate email, weak password, OAuth failure) display user-friendly error messages in Portuguese
9. Page is fully responsive (mobile-first, 375px primary target) with accessible form controls (WCAG 2.1 AA)
10. Registration creates a profile row in the profiles table with display_name and gender_preference (if known)

## Tasks / Subtasks

- [ ] Task 1: Set up Supabase Auth SSR infrastructure (AC: #1, #2, #7)
  - [ ] 1.1 Install `@supabase/ssr` package
  - [ ] 1.2 Create `src/lib/supabase/middleware.ts` utility for cookie-based auth session refresh
  - [ ] 1.3 Update `src/lib/supabase/client.ts` to use `createBrowserClient` from `@supabase/ssr`
  - [ ] 1.4 Update `src/lib/supabase/server.ts` to use `createServerClient` from `@supabase/ssr` with cookie handling
  - [ ] 1.5 Create `src/middleware.ts` (Next.js middleware) that refreshes auth session on every request
  - [ ] 1.6 Create `src/app/auth/callback/route.ts` for OAuth callback handling (code exchange)

- [ ] Task 2: Create registration API route (AC: #1, #8, #10)
  - [ ] 2.1 Create `src/app/api/auth/register/route.ts` with Zod input validation
  - [ ] 2.2 Implement email/password registration via `supabase.auth.signUp()`
  - [ ] 2.3 On successful signup, create a row in `profiles` table with display_name and gender_preference
  - [ ] 2.4 Return appropriate error responses for duplicate email, weak password, etc.

- [ ] Task 3: Create registration page UI (AC: #1, #2, #3, #4, #5, #6, #9)
  - [ ] 3.1 Create `src/app/register/page.tsx` with registration form layout
  - [ ] 3.2 Build form fields: name (text), email (email), password (password with show/hide toggle)
  - [ ] 3.3 Add Google OAuth button as primary CTA (top of form, most prominent)
  - [ ] 3.4 Add LGPD consent checkbox with link to /privacidade
  - [ ] 3.5 Implement client-side form validation with Zod schema (real-time feedback)
  - [ ] 3.6 Apply gender-themed styling using existing ThemeProvider context (useTheme hook)
  - [ ] 3.7 Add "Ja tem conta? Entrar" link to /login page
  - [ ] 3.8 Use Framer Motion for subtle page entrance animation

- [ ] Task 4: Implement Google OAuth flow (AC: #2, #7, #8)
  - [ ] 4.1 Implement `signInWithOAuth({ provider: 'google' })` with redirect to `/auth/callback`
  - [ ] 4.2 Handle OAuth callback: exchange code for session, create profile if first login
  - [ ] 4.3 Handle OAuth errors gracefully with Portuguese error messages

- [ ] Task 5: Post-registration redirect logic (AC: #7)
  - [ ] 5.1 Check for pending consultation in Zustand store / sessionStorage
  - [ ] 5.2 If pending consultation exists, redirect to consultation flow continuation
  - [ ] 5.3 If no pending consultation, redirect to /profile

- [ ] Task 6: Write tests (AC: all)
  - [ ] 6.1 Unit tests for registration form validation (Zod schema)
  - [ ] 6.2 Unit tests for registration API route (success, duplicate email, weak password)
  - [ ] 6.3 Component tests for registration page (form rendering, validation feedback, theme application)
  - [ ] 6.4 Integration test for OAuth button click triggering Supabase OAuth flow

## Dev Notes

### Architecture Patterns and Constraints

- **Supabase Auth SSR Pattern (CRITICAL):** The project currently uses `@supabase/supabase-js` directly in `src/lib/supabase/client.ts` and `server.ts`. Story 8.1 (Supabase Auth Setup) may or may not be implemented before this story. If 8-1 is not yet done, this story MUST set up the `@supabase/ssr` package infrastructure as part of Task 1. The `@supabase/auth-helpers` package is DEPRECATED -- do NOT use it.
- **Cookie-based sessions:** Supabase Auth with Next.js App Router requires cookie-based session management. Server Components cannot write cookies, so a `middleware.ts` is REQUIRED to refresh expired auth tokens on every request.
- **OAuth callback route:** Google OAuth requires a callback route at `src/app/auth/callback/route.ts` that exchanges the auth code for a session using `supabase.auth.exchangeCodeForSession(code)`.
- **Profile creation on signup:** Supabase Auth creates a row in `auth.users` but NOT in the `profiles` table. A database trigger (preferred) or explicit API call must create the profile row. Use a Supabase database trigger: `CREATE OR REPLACE FUNCTION public.handle_new_user() ... INSERT INTO profiles(id, display_name) VALUES (new.id, new.raw_user_meta_data->>'full_name');`
- **Theme integration:** Use the existing `useTheme` hook from `src/hooks/useTheme.ts` and the `ThemeProvider` from `src/components/layout/ThemeProvider.tsx`. If gender was selected before registration, the theme should already be active. The registration page must respect the current theme state.
- **State management:** Use Zustand store at `src/stores/consultation.ts` to check for in-progress consultations for post-registration redirect logic.
- **Input validation:** Use Zod schemas (project standard) for both client-side and server-side validation. Do NOT use separate validation libraries.
- **Component library:** Use shadcn/ui components from `src/components/ui/` for form inputs, buttons, and cards. Follow the existing component patterns.
- **Lucide icons:** Use Lucide icon set (already installed as `lucide-react`) for all icons.
- **Animation:** Use Framer Motion (already installed) for page entrance animation. Follow existing patterns: 350ms ease-in-out for page transitions.
- **Portuguese language:** All user-facing text MUST be in Portuguese (Brazil). Error messages, labels, placeholders, CTAs -- all in Portuguese.
- **Existing Supabase client files:**
  - `src/lib/supabase/client.ts` - Browser client (currently basic, needs SSR upgrade)
  - `src/lib/supabase/server.ts` - Server client (currently uses service role key, needs SSR upgrade)
- **Existing types:** `src/types/index.ts` contains Gender type and ThemeColors. Do NOT duplicate types -- extend the existing file if needed.
- **Testing:** Use Vitest (project standard). Test files go in `src/test/`. Follow existing test naming pattern: `src/test/<feature>.test.ts(x)`.

### File Structure

Files to create:
```
src/app/register/page.tsx              # Registration page
src/app/auth/callback/route.ts         # OAuth callback handler
src/app/api/auth/register/route.ts     # Registration API route
src/lib/supabase/middleware.ts         # Supabase session refresh utility
src/middleware.ts                       # Next.js middleware (auth session refresh)
src/test/registration-page.test.tsx    # Component tests
src/test/registration-api.test.ts      # API route tests
```

Files to modify:
```
src/lib/supabase/client.ts             # Upgrade to @supabase/ssr createBrowserClient
src/lib/supabase/server.ts             # Upgrade to @supabase/ssr createServerClient
src/types/index.ts                     # Add auth-related types if needed
package.json                           # Add @supabase/ssr dependency
```

### Database Requirements

```sql
-- Profile creation trigger (should be created in Supabase SQL editor or migration)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, gender_preference)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### LGPD Compliance Requirements

- Consent checkbox text: "Consinto o processamento dos meus dados conforme a Politica de Privacidade"
- Checkbox MUST be unchecked by default
- Form cannot be submitted without checking the consent box
- Link to /privacidade must be embedded in the consent text
- Store consent timestamp in the profiles table or a separate consent_logs table

### Security Considerations

- Password requirements: minimum 8 characters (Supabase default)
- Email verification: Supabase sends verification email automatically on signUp
- OAuth: Google OAuth configured in Supabase Dashboard (not in code)
- Never store raw passwords client-side
- Rate limiting: Supabase Auth has built-in rate limiting for auth endpoints
- CORS: Supabase client configured with project URL (already set up)

### UI/UX Requirements from Design Spec

- **Layout:** Clean, minimal registration form centered on page
- **Google OAuth:** Primary button position (top of form), most prominent
- **Form fields:** Name, email, password (with show/hide toggle)
- **LGPD consent:** Checkbox with linked text
- **Theme:** Gender-adaptive if gender was previously selected
- **Responsive:** Mobile-first (375px primary), 48px min touch targets
- **Typography:** Follow design system -- Space Grotesk for headings, Inter for body
- **Border radius:** Cards 16px, buttons 12px
- **Error states:** Red pulse on invalid fields, specific error message below field
- **Empty state link:** "Ja tem conta? Entrar" link to /login at bottom
- **Animation:** Page slides in from right with Framer Motion (350ms ease-in-out)

### Project Structure Notes

- Alignment with architecture spec: `src/app/register/page.tsx` matches the planned structure in Section 6.1
- Auth callback at `src/app/auth/callback/route.ts` follows Next.js App Router conventions
- API route at `src/app/api/auth/register/route.ts` follows the existing API route pattern
- Supabase SSR utilities in `src/lib/supabase/` extend the existing Supabase module

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#5.3 Auth] - Auth API routes specification
- [Source: _bmad-output/planning-artifacts/architecture.md#6.1 Project Structure] - File path conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#7.1 Authentication] - Auth architecture (JWT, OAuth, guest sessions)
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Entity Relationship] - profiles table schema
- [Source: _bmad-output/planning-artifacts/architecture.md#3.2 Row-Level Security] - RLS policies for profiles
- [Source: _bmad-output/planning-artifacts/architecture.md#7.2 Data Protection] - LGPD consent requirements
- [Source: _bmad-output/planning-artifacts/ux-design.md#3.9 Auth Screens] - Registration UX specification
- [Source: _bmad-output/planning-artifacts/ux-design.md#1.1 Visual Identity] - Dual theme system design
- [Source: _bmad-output/planning-artifacts/ux-design.md#2.3 Guest vs Auth Flow] - Guest-to-auth flow context
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S8.2] - Story acceptance criteria and context
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E8 Elicitation] - Auth epic elicitation context
- [Source: _bmad-output/planning-artifacts/prd.md#User Onboarding & Authentication] - FR1, FR2 requirements
- [Source: Supabase Docs - Setting up Server-Side Auth for Next.js] - @supabase/ssr package setup
- [Source: Supabase Docs - Creating a Supabase client for SSR] - createBrowserClient / createServerClient patterns

### Latest Technical Notes (as of 2026-03-02)

- **@supabase/ssr v0.8.x** is the current stable package for Next.js SSR auth. Do NOT use the deprecated `@supabase/auth-helpers-nextjs`.
- **@supabase/supabase-js v2.98.0** is already installed in the project.
- **Next.js 16.1.6** is the project's version. The middleware.ts approach for session refresh is fully supported.
- **Key pattern:** `createBrowserClient(url, anonKey)` for client, `createServerClient(url, anonKey, { cookies })` for server with cookie getter/setter.
- **Google OAuth:** Requires configuration in the Supabase Dashboard under Authentication > Providers > Google. The code only needs `signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
