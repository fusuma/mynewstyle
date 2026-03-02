'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/useTheme';
import { useConsultationStore } from '@/stores/consultation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { claimGuestSession } from '@/lib/auth/claim-guest';

// ─── Google Icon SVG ──────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Email validation ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// ─── Redirect validation ──────────────────────────────────────────────────────

/**
 * Validates that a redirect URL is a relative path (same-origin) to prevent
 * open redirect attacks. Rejects absolute URLs (including //evil.com).
 */
function isSafeRedirect(url: string | null): url is string {
  if (!url) return false;
  // Must start with '/' but not '//' (protocol-relative URL)
  return url.startsWith('/') && !url.startsWith('//');
}

// ─── Error code mapping ───────────────────────────────────────────────────────

function mapAuthError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'Ocorreu um erro. Tente novamente.';
  const code = error.code ?? error.message ?? '';
  if (code.includes('invalid_credentials') || code.includes('Invalid login credentials')) {
    return 'Email ou senha incorretos';
  }
  if (code.includes('email_not_confirmed')) {
    return 'Confirme o seu email primeiro';
  }
  if (code.includes('too_many_requests') || code.includes('rate_limit')) {
    return 'Aguarde antes de tentar novamente';
  }
  return 'Ocorreu um erro. Tente novamente.';
}

// ─── LoginForm Component ──────────────────────────────────────────────────────

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { gender, setGender, theme } = useTheme();

  const consultationGender = useConsultationStore((s) => s.gender);
  const consultationId = useConsultationStore((s) => s.consultationId);
  const photoPreview = useConsultationStore((s) => s.photoPreview);

  // Instantiate Supabase client once per component mount
  const supabase = useMemo(() => createClient(), []);

  // Sync ThemeProvider with consultation gender if not already set
  useEffect(() => {
    if (!gender && consultationGender) {
      setGender(consultationGender);
    }
  }, [gender, consultationGender, setGender]);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  // ── Password reset state ─────────────────────────────────────────────────────
  const [showResetMode, setShowResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // ── Post-login redirect logic ────────────────────────────────────────────────
  const handleSuccessfulLogin = useCallback(async () => {
    // Task 5.2 (Story 8-5): Claim any pending guest consultation data after login.
    // This is best-effort -- it never blocks the login flow on failure.
    const claim = await claimGuestSession();
    if (claim.migrated > 0) {
      toast.success('Sua consultoria foi salva no seu perfil!');
    }

    const redirectTo = searchParams.get('redirect');

    // Only allow same-origin relative paths to prevent open redirect attacks
    if (isSafeRedirect(redirectTo)) {
      router.push(redirectTo);
    } else if (consultationId) {
      router.push(`/consultation/results/${consultationId}`);
    } else if (consultationGender && photoPreview) {
      router.push('/consultation/questionnaire');
    } else if (consultationGender) {
      router.push('/consultation/photo');
    } else {
      router.push('/profile');
    }
  }, [searchParams, consultationId, consultationGender, photoPreview, router]);

  // ── OAuth callback handling ───────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        handleSuccessfulLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, handleSuccessfulLogin]);

  // ── Theme-aware styles ───────────────────────────────────────────────────────
  const activeGender = gender ?? consultationGender;
  const isDark = activeGender === 'male';
  const isFemale = activeGender === 'female';

  const containerStyle = {
    backgroundColor: theme.background,
    color: theme.foreground,
    minHeight: '100dvh',
  };

  const cardClass = isDark
    ? 'bg-[#1a1a2e]/80 border border-[#2D2D3A]'
    : isFemale
    ? 'bg-white/80 border border-[#f5e6d3]'
    : 'bg-white border border-gray-200';

  const inputClass = isDark
    ? 'bg-[#2D2D3A] border-[#3d3d4e] text-white placeholder:text-gray-500 focus:border-[#F5A623]'
    : isFemale
    ? 'bg-[#FFF8F0] border-[#ddc5b5] text-[#2D2D3A] placeholder:text-[#b0906a] focus:border-[#A85C60]'
    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500';

  const labelClass = isDark
    ? 'text-gray-300'
    : isFemale
    ? 'text-[#5a3a2e]'
    : 'text-gray-700';

  const accentColor = isDark ? '#F5A623' : isFemale ? '#A85C60' : '#3b82f6';

  const mutedTextClass = isDark
    ? 'text-gray-500'
    : isFemale
    ? 'text-[#b0906a]'
    : 'text-gray-500';

  const dividerClass = isDark
    ? 'border-[#2D2D3A]'
    : isFemale
    ? 'border-[#f0d9c5]'
    : 'border-gray-200';

  // ── Validation ───────────────────────────────────────────────────────────────
  function validateEmail(value: string): string | null {
    if (!value) return 'Email é obrigatório';
    if (!isValidEmail(value)) return 'Formato de email inválido';
    return null;
  }

  function validatePassword(value: string): string | null {
    if (!value) return 'Senha é obrigatória';
    return null;
  }

  function handleEmailBlur() {
    setEmailError(validateEmail(email));
  }

  function handlePasswordBlur() {
    setPasswordError(validatePassword(password));
  }

  // ── Email/password login ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    if (emailErr || passwordErr) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setGlobalError(mapAuthError(error));
        return;
      }

      // Note: onAuthStateChange will fire SIGNED_IN and call handleSuccessfulLogin.
      // We do NOT call handleSuccessfulLogin() directly here to avoid double redirect.
    } catch {
      setGlobalError('Erro de conexao. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Google OAuth login ────────────────────────────────────────────────────────
  async function handleGoogleOAuth() {
    setIsOAuthLoading(true);
    setGlobalError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login?auth_callback=true`,
        },
      });

      if (error) {
        setGlobalError('Erro ao conectar com o Google. Tente novamente.');
      }
    } catch {
      setGlobalError('Erro ao conectar com o Google. Tente novamente.');
    } finally {
      setIsOAuthLoading(false);
    }
  }

  // ── Password reset ────────────────────────────────────────────────────────────
  function handleForgotPasswordClick() {
    // Reuse email field value if already filled
    setResetEmail(email);
    setResetError(null);
    setResetSuccess(false);
    setShowResetMode(true);
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);

    if (!resetEmail || !isValidEmail(resetEmail)) {
      setResetError('Insira um email valido');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (error) {
        if (error.message?.includes('rate') || error.message?.includes('limit')) {
          setResetError('Aguarde antes de tentar novamente');
        } else {
          setResetError('Insira um email valido');
        }
        return;
      }

      setResetSuccess(true);
    } catch {
      setResetError('Erro de conexao. Tente novamente.');
    } finally {
      setResetLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // ── Password Reset Mode ───────────────────────────────────────────────────────
  if (showResetMode) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1
              className="mb-2 font-['Space_Grotesk',sans-serif] text-2xl font-bold tracking-tight"
              style={{ color: theme.foreground }}
            >
              Recuperar senha
            </h1>
            <p className={cn('text-sm', mutedTextClass)}>
              Informe o seu email para receber o link de recuperação
            </p>
          </div>

          <Card className={cn('rounded-[16px] p-6 shadow-lg border-0', cardClass)}>
            {/* Success message */}
            {resetSuccess && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"
              >
                Email de recuperacao enviado. Verifique a sua caixa de entrada.
              </div>
            )}

            {/* Error message */}
            {resetError && (
              <div
                id="reset-email-error"
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{resetError}</span>
              </div>
            )}

            {!resetSuccess && (
              <form onSubmit={handlePasswordReset} noValidate className="space-y-4">
                {/* Email field */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className={cn('mb-1 block text-sm font-medium', labelClass)}
                  >
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    aria-describedby={resetError ? 'reset-email-error' : undefined}
                    className={cn(
                      'min-h-[48px] w-full rounded-[12px] border px-4 py-3 text-sm outline-none transition-colors',
                      inputClass
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetLoading}
                  aria-busy={resetLoading}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar email de recuperação'
                  )}
                </Button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setShowResetMode(false)}
              className={cn('mt-4 w-full text-center text-sm underline hover:opacity-80', mutedTextClass)}
            >
              Voltar ao login
            </button>
          </Card>
        </div>
      </div>
    );
  }

  // ── Normal Login Mode ─────────────────────────────────────────────────────────
  return (
    <div
      style={containerStyle}
      className="flex items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="mb-2 font-['Space_Grotesk',sans-serif] text-2xl font-bold tracking-tight"
            style={{ color: theme.foreground }}
          >
            Entrar na sua conta
          </h1>
          <p className={cn('text-sm', mutedTextClass)}>
            Acesse o histórico e consultas salvas
          </p>
        </div>

        {/* Card - uses shadcn Card component per Task 2.10 */}
        <Card className={cn('rounded-[16px] p-6 shadow-lg border-0', cardClass)}>
          {/* Global error */}
          {globalError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Google OAuth Button (primary CTA, top of form) */}
          <Button
            type="button"
            variant="outline"
            className="mb-4 w-full gap-3 font-medium"
            aria-label="Continuar com Google"
            onClick={handleGoogleOAuth}
            disabled={isOAuthLoading || isSubmitting}
            aria-busy={isOAuthLoading}
          >
            {isOAuthLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Continuar com Google
          </Button>

          {/* Divider */}
          <div className={cn('relative my-5 flex items-center', dividerClass)}>
            <div className={cn('flex-grow border-t', dividerClass)} />
            <span className={cn('mx-3 shrink-0 text-xs', mutedTextClass)}>ou</span>
            <div className={cn('flex-grow border-t', dividerClass)} />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email field */}
            <div>
              <label
                htmlFor="login-email"
                className={cn('mb-1 block text-sm font-medium', labelClass)}
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  setGlobalError(null);
                }}
                onBlur={handleEmailBlur}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'login-email-error' : undefined}
                className={cn(
                  'min-h-[48px] w-full rounded-[12px] border px-4 py-3 text-sm outline-none transition-colors',
                  inputClass,
                  emailError && 'border-red-500 focus:border-red-500'
                )}
              />
              {emailError && (
                <p id="login-email-error" role="alert" className="mt-1 text-xs text-red-500">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="login-password"
                className={cn('mb-1 block text-sm font-medium', labelClass)}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    setGlobalError(null);
                  }}
                  onBlur={handlePasswordBlur}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'login-password-error' : undefined}
                  className={cn(
                    'min-h-[48px] w-full rounded-[12px] border px-4 py-3 pr-12 text-sm outline-none transition-colors',
                    inputClass,
                    passwordError && 'border-red-500 focus:border-red-500'
                  )}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                  className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-80',
                    mutedTextClass
                  )}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p id="login-password-error" role="alert" className="mt-1 text-xs text-red-500">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                className={cn('text-xs underline hover:opacity-80', mutedTextClass)}
                style={{ color: accentColor }}
              >
                Esqueci a senha
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isOAuthLoading}
              aria-busy={isSubmitting}
              style={
                !isDark && !isFemale
                  ? {}
                  : { backgroundColor: accentColor, color: isDark ? '#1a1a2e' : '#fff' }
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </Card>

        {/* Footer link to register */}
        <p className={cn('mt-6 text-center text-sm', mutedTextClass)}>
          Não tem conta?{' '}
          <Link
            href="/register"
            className="font-medium underline hover:opacity-80"
            style={{ color: accentColor }}
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
