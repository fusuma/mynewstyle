# Story 8.3: Login Page

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **returning user**,
I want **to log in to access my history**,
so that **I can view my past consultations, favorites, and continue where I left off**.

## Acceptance Criteria

1. Email/password login form with client-side validation (email format, password non-empty)
2. Google OAuth login button (primary/prominent position, per architecture: Supabase Auth Google OAuth 2.0)
3. "Esqueci a senha" (Forgot password) link that triggers Supabase password reset email flow
4. On successful login, redirect to `/profile` if no pending consultation, or resume pending consultation flow if one exists in session
5. Login page respects the selected gender theme (if gender was previously chosen in session) or uses neutral default
6. Link to registration page (`/register`) for users who don't have an account
7. Error handling: display clear, user-friendly error messages for invalid credentials, network errors, and OAuth failures
8. Loading states on all interactive elements during authentication (button spinners, disabled inputs)
9. Page is accessible: keyboard-navigable, proper labels, WCAG 2.1 AA contrast compliance
10. Login page is server-side rendered for SEO (static shell) with client-side interactivity for form submission

## Tasks / Subtasks

- [ ] Task 1: Create login page route (AC: 5, 10)
  - [ ] 1.1 Create `src/app/login/page.tsx` as the Next.js App Router page
  - [ ] 1.2 Add metadata export (`title: "Login | MyNewStyle"`, `description`)
  - [ ] 1.3 Import and render the `LoginForm` client component
  - [ ] 1.4 Page should be a server component that renders a client component for form interactivity

- [ ] Task 2: Create LoginForm client component (AC: 1, 2, 5, 6, 7, 8, 9)
  - [ ] 2.1 Create `src/components/auth/LoginForm.tsx` as `'use client'` component
  - [ ] 2.2 Email input field with `type="email"`, required, `aria-label`, `aria-describedby` for errors
  - [ ] 2.3 Password input field with `type="password"`, required, `aria-label`, `aria-describedby` for errors
  - [ ] 2.4 Client-side validation: email format regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), password min 1 char
  - [ ] 2.5 "Entrar" (Login) submit button using `<Button>` from `@/components/ui/button`
  - [ ] 2.6 Google OAuth button: "Continuar com Google" using `<Button variant="outline">` with Google SVG icon
  - [ ] 2.7 "Esqueci a senha" link below password field (text button, navigates to inline reset flow or separate handler)
  - [ ] 2.8 "Não tem conta? Criar conta" link at bottom, linking to `/register`
  - [ ] 2.9 Apply gender-aware theme: read gender from `useConsultationStore` (sessionStorage), use neutral if null
  - [ ] 2.10 Wrap form in shadcn `<Card>` component for consistent styling

- [ ] Task 3: Implement email/password login (AC: 1, 7, 8)
  - [ ] 3.1 On form submit, call `supabase.auth.signInWithPassword({ email, password })`
  - [ ] 3.2 Import Supabase browser client from `@/lib/supabase/client`
  - [ ] 3.3 Handle Supabase error responses: map `AuthApiError` codes to user-friendly Portuguese messages
  - [ ] 3.4 Error message mapping: `invalid_credentials` -> "Email ou senha incorretos", `email_not_confirmed` -> "Confirme o seu email primeiro", network error -> "Erro de conexao. Tente novamente."
  - [ ] 3.5 Show loading spinner on submit button during auth request (replace button text with `<Loader2>` icon)
  - [ ] 3.6 Disable all form inputs and buttons during loading

- [ ] Task 4: Implement Google OAuth login (AC: 2, 7, 8)
  - [ ] 4.1 On Google button click, call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/login?auth_callback=true' } })`
  - [ ] 4.2 Show loading state on Google button during redirect
  - [ ] 4.3 Handle OAuth errors on callback (check URL params for `error` and `error_description`)
  - [ ] 4.4 Display OAuth error messages to user via toast or inline error

- [ ] Task 5: Implement password reset flow (AC: 3, 7, 8)
  - [ ] 5.1 On "Esqueci a senha" click, show inline email input (reuse the email field value if already filled)
  - [ ] 5.2 Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login?reset=true' })`
  - [ ] 5.3 Show success message: "Email de recuperacao enviado. Verifique a sua caixa de entrada."
  - [ ] 5.4 Handle errors: invalid email -> "Insira um email valido", rate limit -> "Aguarde antes de tentar novamente"
  - [ ] 5.5 Loading state on reset request button

- [ ] Task 6: Implement post-login redirect logic (AC: 4)
  - [ ] 6.1 After successful login, check `useConsultationStore` for `consultationId` or active flow state (gender + photo set)
  - [ ] 6.2 If pending consultation exists in session: redirect to appropriate step in the consultation flow
  - [ ] 6.3 If no pending consultation: redirect to `/profile`
  - [ ] 6.4 Use Next.js `useRouter()` from `next/navigation` for client-side redirects
  - [ ] 6.5 Handle `?redirect=` URL parameter: if present, redirect to that path after login (for auth-guarded routes in future stories)

- [ ] Task 7: Write tests (AC: 1-9)
  - [ ] 7.1 Unit test: LoginForm renders email input, password input, submit button, Google button, forgot password link, register link
  - [ ] 7.2 Unit test: Client-side validation shows error for invalid email format
  - [ ] 7.3 Unit test: Client-side validation shows error for empty password
  - [ ] 7.4 Unit test: Submit button shows loading state during auth request
  - [ ] 7.5 Unit test: Error message displayed for invalid credentials
  - [ ] 7.6 Unit test: Success triggers redirect (mock `useRouter`)
  - [ ] 7.7 Unit test: Google OAuth button calls `signInWithOAuth`
  - [ ] 7.8 Unit test: Password reset flow shows success message
  - [ ] 7.9 Unit test: Gender theme applied when gender is set in store
  - [ ] 7.10 Unit test: Neutral theme applied when no gender is set
  - [ ] 7.11 Accessibility test: all inputs have associated labels, form is keyboard-navigable

## Dev Notes

### Architecture Patterns and Constraints

- **Framework:** Next.js 16 App Router. Login page at `src/app/login/page.tsx` (defined in architecture Section 6.1).
- **Auth provider:** Supabase Auth (`@supabase/supabase-js@^2.98.0`). Use the existing browser client from `@/lib/supabase/client` -- DO NOT create a new client.
- **Auth methods:** `supabase.auth.signInWithPassword()` for email/password, `supabase.auth.signInWithOAuth({ provider: 'google' })` for Google OAuth.
- **Password reset:** `supabase.auth.resetPasswordForEmail()` -- sends Supabase-managed email with reset link.
- **State management:** Zustand store at `src/stores/consultation.ts` for session state (gender, pending consultation).
- **UI components:** shadcn/ui (`<Button>`, `<Card>`) from `@/components/ui/`. Do NOT install additional UI libraries.
- **Styling:** Tailwind CSS with design system tokens. Theme via `data-theme="male"/"female"` attribute on `<html>`.
- **Icons:** Lucide React (`lucide-react`) for UI icons (e.g., `Mail`, `Lock`, `Loader2`, `Eye`, `EyeOff`).
- **Navigation:** `useRouter()` from `next/navigation` for client-side redirects after login.
- **Toast notifications:** Use `toast` from `sonner` (already installed and mounted in root layout via `<Toaster />`).

### Supabase Auth API Usage

```typescript
import { supabase } from '@/lib/supabase/client';

// Email/password login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Google OAuth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/login?auth_callback=true`,
  },
});

// Password reset
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/login?reset=true`,
});

// Check current session
const { data: { session } } = await supabase.auth.getSession();
```

**Error codes to handle:**
- `invalid_credentials` -- wrong email/password
- `email_not_confirmed` -- user hasn't verified email yet
- `too_many_requests` -- rate limited (Supabase default: 30/hour)
- Network errors (fetch failures)

### UX Design Specification (from UX Design Section 3.9)

- **Layout:** Clean, minimal. Email/password fields + Google OAuth button.
- **Theme:** Consistent with selected gender theme if chosen (read from consultation store), otherwise neutral default.
- **Links:** "Esqueci a senha" below password field. Link to register page.
- **Error states:** Inline error messages below form fields. Toast for network/server errors.
- **Design reference:** Similar structure to registration page (S8.2) but simpler (fewer fields: no name, no consent checkbox).

### Component Structure

```
src/app/login/page.tsx          -- Server component (metadata + renders LoginForm)
src/components/auth/LoginForm.tsx  -- Client component ('use client', form logic)
```

**LoginForm layout:**

```
+--------------------------------------+
|          MyNewStyle Logo             |
|                                      |
|   ┌─────────────────────────────┐    |
|   │  Entrar na sua conta        │    |
|   │                             │    |
|   │  [Google OAuth Button]      │    |
|   │                             │    |
|   │  ──── ou ────               │    |
|   │                             │    |
|   │  Email                      │    |
|   │  [________________]         │    |
|   │                             │    |
|   │  Senha                      │    |
|   │  [________________] [eye]   │    |
|   │                             │    |
|   │  [Esqueci a senha]          │    |
|   │                             │    |
|   │  [    Entrar    ]           │    |
|   │                             │    |
|   │  Nao tem conta? Criar conta │    |
|   └─────────────────────────────┘    |
+--------------------------------------+
```

### Password Visibility Toggle

Include an eye/eye-off icon button inside the password field to toggle visibility. Use `Eye` and `EyeOff` icons from `lucide-react`. Toggle between `type="password"` and `type="text"`.

### Gender Theme Integration

```typescript
// Read gender from consultation store (sessionStorage persisted)
const gender = useConsultationStore((state) => state.gender);

// The ThemeProvider already sets data-theme on <html> based on gender
// The login page just needs to use semantic Tailwind tokens (bg-primary, text-primary, etc.)
// These will automatically adapt to the active theme

// If no gender is set, the page renders in neutral theme (ThemeProvider default)
```

### Redirect Logic After Login

```typescript
const router = useRouter();
const searchParams = useSearchParams();
const consultationId = useConsultationStore((state) => state.consultationId);
const gender = useConsultationStore((state) => state.gender);
const photo = useConsultationStore((state) => state.photoPreview);

function handleSuccessfulLogin() {
  const redirectTo = searchParams.get('redirect');

  if (redirectTo) {
    router.push(redirectTo);
  } else if (consultationId) {
    // Resume consultation flow
    router.push(`/consultation/results/${consultationId}`);
  } else if (gender && photo) {
    // User was mid-flow, resume questionnaire
    router.push('/consultation/questionnaire');
  } else if (gender) {
    router.push('/consultation/photo');
  } else {
    router.push('/profile');
  }
}
```

**Note:** The `/profile` route does not exist yet (Story 8-6). For now, redirect to `/` (landing page) as fallback if `/profile` is not yet implemented. The dev agent should check if the route exists and handle accordingly.

### OAuth Callback Handling

After Google OAuth redirect, Supabase automatically handles the callback and sets the session. The login page should:
1. Check for `auth_callback=true` in URL params on mount
2. Listen for `supabase.auth.onAuthStateChange()` to detect when session is established
3. Once session confirmed, trigger the redirect logic

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      handleSuccessfulLogin();
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

### Existing Files -- DO NOT Recreate

- `src/lib/supabase/client.ts` -- Browser Supabase client (already created in previous stories)
- `src/lib/supabase/server.ts` -- Server Supabase client (already created)
- `src/components/ui/button.tsx` -- shadcn Button component
- `src/components/ui/card.tsx` -- shadcn Card component
- `src/stores/consultation.ts` -- Zustand consultation store (has gender, consultationId, photoPreview)
- `src/components/layout/ThemeProvider.tsx` -- Theme provider (already handles data-theme attribute)
- `src/app/layout.tsx` -- Root layout with ThemeProvider and Toaster already mounted

### New Files to Create

- `src/app/login/page.tsx` -- Login page (server component shell)
- `src/components/auth/LoginForm.tsx` -- Login form client component

### Dependencies

- **Story 8-1 (Supabase Auth Setup):** This story assumes Supabase Auth is configured with email/password and Google OAuth provider. If 8-1 is not yet implemented, the login page can still be built but will not function until auth is configured in the Supabase dashboard.
- **Story 8-2 (Registration Page):** The "Criar conta" link on the login page points to `/register`. If 8-2 is not yet implemented, the link will lead to a 404. This is acceptable -- the link should still be present for when 8-2 is implemented.
- **No dependencies on:** Stories 8-4 through 8-6 (guest sessions, migration, profile).

### Project Structure Notes

- Auth components should live in `src/components/auth/` (new directory) -- this is NOT defined in the architecture's component tree under `src/components/` but is the natural location following the existing pattern of grouping by feature (`consultation/`, `landing/`, `share/`, `layout/`).
- The architecture defines `src/app/login/page.tsx` in Section 6.1 -- follow this exactly.
- Tests should go in `src/test/` directory following the established pattern (e.g., `src/test/login-form.test.tsx`).

### Testing Standards

- **Test runner:** Vitest (`vitest run`)
- **Testing library:** React Testing Library (`@testing-library/react`)
- **Assertions:** `@testing-library/jest-dom` matchers
- **Mocking Supabase:** Mock `@/lib/supabase/client` module -- mock `supabase.auth.signInWithPassword`, `supabase.auth.signInWithOAuth`, `supabase.auth.resetPasswordForEmail`, `supabase.auth.onAuthStateChange`, `supabase.auth.getSession`
- **Mocking Router:** Mock `next/navigation` -- mock `useRouter` (returns `{ push: vi.fn() }`), `useSearchParams`
- **Mocking Store:** Mock `@/stores/consultation` -- set gender/consultationId/photoPreview for redirect tests
- **Test file naming:** `src/test/login-form.test.tsx`
- **Pattern from previous stories:** Co-located in `src/test/` (see 7-7 story: `src/test/barber-card.test.tsx`, etc.)

### Accessibility Requirements (WCAG 2.1 AA)

- All form inputs must have associated `<label>` elements (or `aria-label`)
- Error messages linked to inputs via `aria-describedby`
- Focus management: auto-focus email field on page load
- Color contrast: 4.5:1 minimum for all text
- Form submission via Enter key
- Google OAuth button: `aria-label="Continuar com Google"`
- Loading states announced to screen readers via `aria-busy` and `aria-live="polite"` regions

### Internationalization Note

All user-facing strings should be in Portuguese (PT) as the primary language, consistent with the rest of the application:
- "Entrar na sua conta" (Sign in to your account)
- "Entrar" (Sign in)
- "Continuar com Google" (Continue with Google)
- "ou" (or)
- "Email" (Email)
- "Senha" (Password)
- "Esqueci a senha" (Forgot password)
- "Nao tem conta? Criar conta" (Don't have an account? Create account)
- "Email ou senha incorretos" (Incorrect email or password)
- "Confirme o seu email primeiro" (Confirm your email first)
- "Email de recuperacao enviado. Verifique a sua caixa de entrada." (Recovery email sent. Check your inbox.)

### Security Considerations

- Password field must NOT be autocomplete-disabled (browsers should be allowed to autofill)
- Add `autocomplete="email"` to email field and `autocomplete="current-password"` to password field
- Never log or display the password in error messages
- Rate limiting is handled server-side by Supabase (30 auth attempts/hour default)
- CSRF protection handled by Supabase Auth SDK internally

### Recent Codebase Patterns (from Git/Story 7-7)

- `'use client'` directive at top of client components
- Props interface defined in same file as component
- Use `cn()` utility from `@/lib/utils` for conditional className merging
- Toast errors via `toast.error()` from `sonner`
- Button loading pattern: swap icon to `<Loader2 className="animate-spin" />`, add `disabled` prop
- `aria-busy` on loading buttons (established in story 7-7 code review)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S8.3] -- Story requirements and AC
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E8] -- Epic context: auth exists to persist data, not gatekeep
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.9] -- Auth screens: Login clean/minimal, email/password + Google OAuth, link to register, gender-themed
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 2.3] -- Guest vs Auth flow
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.3] -- API auth routes: POST /api/auth/login, GET /api/auth/session
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.1] -- Authentication: Supabase Auth with JWT 24h, Google OAuth 2.0
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1] -- Frontend structure: src/app/login/page.tsx
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 2.2] -- Backend: Supabase Auth for email/password + Google OAuth
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.3] -- API Security: rate limiting, input validation
- [Source: src/lib/supabase/client.ts] -- Existing Supabase browser client
- [Source: src/stores/consultation.ts] -- Zustand store with gender, consultationId, photoPreview
- [Source: src/components/layout/ThemeProvider.tsx] -- Theme provider with data-theme attribute
- [Source: src/components/ui/button.tsx] -- shadcn Button with variants (default, secondary, ghost, outline, link)
- [Source: src/components/ui/card.tsx] -- shadcn Card component
- [Source: src/app/layout.tsx] -- Root layout with ThemeProvider + Toaster mounted
- [Source: _bmad-output/implementation-artifacts/7-7-barber-reference-card.md] -- Recent patterns: aria-busy, toast.error, Loader2 spinner

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
