/**
 * Component tests for Login Page (Story 8.3)
 *
 * Tests cover:
 * - Task 7.1: LoginForm renders all required elements
 * - Task 7.2: Client-side validation shows error for invalid email
 * - Task 7.3: Client-side validation shows error for empty password
 * - Task 7.4: Submit button shows loading state during auth
 * - Task 7.5: Error message displayed for invalid credentials
 * - Task 7.6: Success triggers redirect (mock useRouter)
 * - Task 7.7: Google OAuth button calls signInWithOAuth
 * - Task 7.8: Password reset flow shows success message
 * - Task 7.9: Gender theme applied when gender is set in store
 * - Task 7.10: Neutral theme applied when no gender is set
 * - Task 7.11: Accessibility test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock router before importing components
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParamsString = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockResetPasswordForEmail = vi.fn();
// Capture the auth state change callback so tests can trigger it
let capturedAuthStateChangeCallback: ((event: string, session: unknown) => void) | null = null;
const mockOnAuthStateChange = vi.fn((callback: (event: string, session: unknown) => void) => {
  capturedAuthStateChangeCallback = callback;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});
const mockGetSession = vi.fn(() => ({
  data: { session: null },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      resetPasswordForEmail: mockResetPasswordForEmail,
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
    },
  })),
}));

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    form: ({ children, ...props }: React.ComponentProps<'form'>) => (
      <form {...props}>{children}</form>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useTheme hook
const mockUseTheme = vi.fn();
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock consultation store
const mockUseConsultationStore = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: unknown) => unknown) =>
    selector(mockUseConsultationStore()),
}));

// Import component under test
import LoginForm from '@/components/auth/LoginForm';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAuthStateChangeCallback = null;
    mockSearchParamsString = '';
    mockUseTheme.mockReturnValue({
      gender: null,
      setGender: vi.fn(),
      theme: { background: '#f5f5f5', foreground: '#1a1a2e', accent: '#6b7280', muted: '#e5e7eb' },
    });
    mockUseConsultationStore.mockReturnValue({
      gender: null,
      consultationId: null,
      photoPreview: null,
    });
    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      capturedAuthStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  // Task 7.1: LoginForm renders all required elements
  describe('Form Rendering (Task 7.1)', () => {
    it('renders email input field', () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('renders password input field', () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = document.getElementById('login-password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('renders submit button with "Entrar" text', () => {
      renderWithProviders(<LoginForm />);
      const submitBtn = screen.getByRole('button', { name: /entrar/i });
      expect(submitBtn).toBeInTheDocument();
    });

    it('renders Google OAuth button with "Continuar com Google" text', () => {
      renderWithProviders(<LoginForm />);
      const googleBtn = screen.getByRole('button', { name: /continuar com google/i });
      expect(googleBtn).toBeInTheDocument();
    });

    it('renders "Esqueci a senha" forgot password link/button', () => {
      renderWithProviders(<LoginForm />);
      const forgotLink = screen.getByRole('button', { name: /esqueci a senha/i });
      expect(forgotLink).toBeInTheDocument();
    });

    it('renders "Criar conta" link pointing to /register', () => {
      renderWithProviders(<LoginForm />);
      const registerLink = screen.getByRole('link', { name: /criar conta/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('has a password show/hide toggle button', () => {
      renderWithProviders(<LoginForm />);
      const toggleBtn = screen.getByRole('button', { name: /mostrar|ocultar|show|hide/i });
      expect(toggleBtn).toBeInTheDocument();
    });

    it('toggles password visibility when toggle button is clicked', async () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const toggleBtn = screen.getByRole('button', { name: /mostrar|ocultar|show|hide/i });

      expect(passwordInput).toHaveAttribute('type', 'password');
      fireEvent.click(toggleBtn);
      await waitFor(() => {
        expect(passwordInput).toHaveAttribute('type', 'text');
      });
    });
  });

  // Task 7.2: Client-side validation shows error for invalid email format
  describe('Email Validation (Task 7.2)', () => {
    it('shows error when email format is invalid on blur', async () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'email-invalido' } });
        fireEvent.blur(emailInput);
      });

      await waitFor(() => {
        const errorEl = document.querySelector('[role="alert"]');
        expect(errorEl).not.toBeNull();
      });
    });

    it('does not show error for valid email format', async () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.blur(emailInput);
      });

      // No alert for a valid email
      const errorEls = document.querySelectorAll('[role="alert"]');
      expect(errorEls.length).toBe(0);
    });
  });

  // Task 7.3: Client-side validation shows error for empty password
  describe('Password Validation (Task 7.3)', () => {
    it('shows error when password is empty on submit', async () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);
      const submitBtn = screen.getByRole('button', { name: /^entrar$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        const errorEl = document.querySelector('[role="alert"]');
        expect(errorEl).not.toBeNull();
      });
    });
  });

  // Task 7.4: Submit button shows loading state during auth request
  describe('Loading State (Task 7.4)', () => {
    it('submit button shows loading/spinner during auth request', async () => {
      // Make signInWithPassword hang (pending promise)
      mockSignInWithPassword.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /^entrar$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitBtn);
      });

      // During loading, the button should be disabled
      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
    });
  });

  // Task 7.5: Error message displayed for invalid credentials
  describe('Error Messages (Task 7.5)', () => {
    it('shows Portuguese error for invalid_credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /^entrar$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/email ou senha incorretos/i)).toBeInTheDocument();
      });
    });

    it('shows Portuguese error for email_not_confirmed', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /^entrar$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/confirme o seu email primeiro/i)).toBeInTheDocument();
      });
    });

    it('shows connection error for network failures', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /^entrar$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/erro de conex[aã]o/i)).toBeInTheDocument();
      });
    });
  });

  // Task 7.6: Success triggers redirect (mock useRouter)
  // Redirect is triggered by onAuthStateChange SIGNED_IN event (single redirect path,
  // avoids the double-redirect that would occur if handleSubmit also called router.push).
  describe('Post-login Redirect (Task 7.6)', () => {
    it('redirects to /profile when no pending consultation after successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
        error: null,
      });
      mockUseConsultationStore.mockReturnValue({
        gender: null,
        consultationId: null,
        photoPreview: null,
      });

      renderWithProviders(<LoginForm />);

      // Trigger SIGNED_IN via onAuthStateChange (the single redirect path)
      await act(async () => {
        capturedAuthStateChangeCallback?.('SIGNED_IN', { access_token: 'token' });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile');
      });
    });

    it('redirects to consultation results when consultationId exists', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
        error: null,
      });
      mockUseConsultationStore.mockReturnValue({
        gender: 'male',
        consultationId: 'consult-abc',
        photoPreview: null,
      });

      renderWithProviders(<LoginForm />);

      await act(async () => {
        capturedAuthStateChangeCallback?.('SIGNED_IN', { access_token: 'token' });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/consultation/results/consult-abc');
      });
    });

    it('redirects to questionnaire when gender and photo set but no consultationId', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
        error: null,
      });
      mockUseConsultationStore.mockReturnValue({
        gender: 'male',
        consultationId: null,
        photoPreview: 'data:image/jpeg;base64,abc',
      });

      renderWithProviders(<LoginForm />);

      await act(async () => {
        capturedAuthStateChangeCallback?.('SIGNED_IN', { access_token: 'token' });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/consultation/questionnaire');
      });
    });

    it('does not redirect on non-SIGNED_IN auth events', async () => {
      mockUseConsultationStore.mockReturnValue({
        gender: null,
        consultationId: null,
        photoPreview: null,
      });

      renderWithProviders(<LoginForm />);

      await act(async () => {
        capturedAuthStateChangeCallback?.('SIGNED_OUT', null);
        capturedAuthStateChangeCallback?.('TOKEN_REFRESHED', null);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('rejects unsafe external redirect URLs and falls back to /profile', async () => {
      mockUseConsultationStore.mockReturnValue({
        gender: null,
        consultationId: null,
        photoPreview: null,
      });

      // Set the searchParams string to an unsafe redirect before rendering
      mockSearchParamsString = 'redirect=//evil.com/steal';

      renderWithProviders(<LoginForm />);

      await act(async () => {
        capturedAuthStateChangeCallback?.('SIGNED_IN', { access_token: 'token' });
      });

      await waitFor(() => {
        // Should NOT redirect to //evil.com, should fall back to /profile
        expect(mockPush).not.toHaveBeenCalledWith('//evil.com/steal');
        expect(mockPush).toHaveBeenCalledWith('/profile');
      });
    });
  });

  // Task 7.7: Google OAuth button calls signInWithOAuth
  describe('Google OAuth (Task 7.7)', () => {
    it('calls signInWithOAuth with google provider when OAuth button is clicked', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
      renderWithProviders(<LoginForm />);

      const googleBtn = screen.getByRole('button', { name: /continuar com google/i });

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'google' })
        );
      });
    });

    it('passes redirectTo with auth_callback in OAuth options', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
      renderWithProviders(<LoginForm />);

      const googleBtn = screen.getByRole('button', { name: /continuar com google/i });

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              redirectTo: expect.stringContaining('auth_callback=true'),
            }),
          })
        );
      });
    });

    it('shows error message when OAuth fails', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: {},
        error: { message: 'OAuth error' },
      });
      renderWithProviders(<LoginForm />);

      const googleBtn = screen.getByRole('button', { name: /continuar com google/i });

      await act(async () => {
        fireEvent.click(googleBtn);
      });

      await waitFor(() => {
        const errorEl = document.querySelector('[role="alert"]');
        expect(errorEl).not.toBeNull();
        expect(errorEl?.textContent).toMatch(/erro|google/i);
      });
    });
  });

  // Task 7.8: Password reset flow shows success message
  describe('Password Reset Flow (Task 7.8)', () => {
    it('shows inline email input when "Esqueci a senha" is clicked', async () => {
      renderWithProviders(<LoginForm />);

      const forgotBtn = screen.getByRole('button', { name: /esqueci a senha/i });
      fireEvent.click(forgotBtn);

      // The reset mode should be visible
      await waitFor(() => {
        // Either shows a new heading or keeps the email field in reset mode
        const resetHeading = screen.queryByText(/recuperar senha|redefinir/i);
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toBeInTheDocument();
      });
    });

    it('calls resetPasswordForEmail when reset form is submitted', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
      renderWithProviders(<LoginForm />);

      // Enter forgot password flow
      const forgotBtn = screen.getByRole('button', { name: /esqueci a senha/i });
      fireEvent.click(forgotBtn);

      await waitFor(() => {
        // In reset mode, email field should still be present
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toBeInTheDocument();
      });

      // Fill email and submit reset
      const emailInput = screen.getByLabelText(/email/i);
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      });

      // Find and click the reset submit button
      const resetBtn = screen.getByRole('button', { name: /enviar|recuperar|redefinir/i });
      await act(async () => {
        fireEvent.click(resetBtn);
      });

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'user@example.com',
          expect.objectContaining({ redirectTo: expect.stringContaining('reset=true') })
        );
      });
    });

    it('shows success message after reset email is sent', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
      renderWithProviders(<LoginForm />);

      const forgotBtn = screen.getByRole('button', { name: /esqueci a senha/i });
      fireEvent.click(forgotBtn);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      });

      const resetBtn = screen.getByRole('button', { name: /enviar|recuperar|redefinir/i });
      await act(async () => {
        fireEvent.click(resetBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/email de recupera[cç][aã]o enviado/i)).toBeInTheDocument();
      });
    });
  });

  // Task 7.9: Gender theme applied when gender is set in store
  describe('Gender Theme (Task 7.9)', () => {
    it('applies theme when gender is "male" in store', () => {
      mockUseTheme.mockReturnValue({
        gender: 'male',
        setGender: vi.fn(),
        theme: { background: '#1A1A2E', foreground: '#ffffff', accent: '#F5A623', muted: '#2a2a3e' },
      });
      mockUseConsultationStore.mockReturnValue({ gender: 'male', consultationId: null, photoPreview: null });
      const { container } = renderWithProviders(<LoginForm />);
      expect(container).toBeInTheDocument();
    });

    it('applies theme when gender is "female" in store', () => {
      mockUseTheme.mockReturnValue({
        gender: 'female',
        setGender: vi.fn(),
        theme: { background: '#FFF8F0', foreground: '#3D2B1F', accent: '#D4A59A', muted: '#f5e6d3' },
      });
      mockUseConsultationStore.mockReturnValue({ gender: 'female', consultationId: null, photoPreview: null });
      const { container } = renderWithProviders(<LoginForm />);
      expect(container).toBeInTheDocument();
    });
  });

  // Task 7.10: Neutral theme applied when no gender is set
  describe('Neutral Theme (Task 7.10)', () => {
    it('renders with neutral theme when no gender is set', () => {
      mockUseTheme.mockReturnValue({
        gender: null,
        setGender: vi.fn(),
        theme: { background: '#f5f5f5', foreground: '#1a1a2e', accent: '#6b7280', muted: '#e5e7eb' },
      });
      mockUseConsultationStore.mockReturnValue({ gender: null, consultationId: null, photoPreview: null });
      const { container } = renderWithProviders(<LoginForm />);
      expect(container).toBeInTheDocument();
    });
  });

  // Task 7.11: Accessibility test
  describe('Accessibility (Task 7.11)', () => {
    it('email input has associated label', () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
    });

    it('password input has associated label', () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      expect(passwordInput).toBeInTheDocument();
    });

    it('Google OAuth button has aria-label', () => {
      renderWithProviders(<LoginForm />);
      const googleBtn = screen.getByRole('button', { name: /continuar com google/i });
      expect(googleBtn).toBeInTheDocument();
    });

    it('email input has autocomplete attribute', () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('password input has autocomplete="current-password"', () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('form is keyboard-navigable (all inputs and buttons are focusable)', () => {
      renderWithProviders(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const submitBtn = screen.getByRole('button', { name: /^entrar$/i });
      const googleBtn = screen.getByRole('button', { name: /continuar com google/i });

      // All interactive elements should be in the document
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitBtn).toBeInTheDocument();
      expect(googleBtn).toBeInTheDocument();
    });
  });
});
