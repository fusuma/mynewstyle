'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useConsultationStore } from '@/stores/consultation';
import { createClient } from '@/lib/supabase/client';
import { claimGuestSession } from '@/lib/auth/claim-guest';

// ─── Validation Schema ────────────────────────────────────────────────────────

const registrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  lgpdConsent: z.literal(true, {
    message: 'Você deve aceitar a política de privacidade para continuar',
  }),
});

type RegistrationFields = {
  name: string;
  email: string;
  password: string;
  lgpdConsent: boolean;
};

type FieldErrors = Partial<Record<keyof RegistrationFields, string>>;

// ─── Page animation variants ──────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const pageTransition = { duration: 0.35, ease: 'easeInOut' as const };

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

// ─── Registration Page Component ──────────────────────────────────────────────

export default function RegistrationPage() {
  const router = useRouter();
  const { gender, setGender, theme } = useTheme();
  const consultationGender = useConsultationStore((s) => s.gender);
  const consultationId = useConsultationStore((s) => s.consultationId);

  // Sync ThemeProvider with consultation gender if not already set.
  // This ensures theme.background/foreground are correctly themed when the user
  // arrives at the registration page after completing the consultation gender step.
  useEffect(() => {
    if (!gender && consultationGender) {
      setGender(consultationGender);
    }
  }, [gender, consultationGender, setGender]);

  // Form state
  const [fields, setFields] = useState<RegistrationFields>({
    name: '',
    email: '',
    password: '',
    lgpdConsent: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use gender from consultation store or theme context
  const activeGender = gender ?? consultationGender;

  // ── Theme-aware styles ──────────────────────────────────────────────────────

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

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateField(name: keyof RegistrationFields, value: string | boolean): string | undefined {
    const partial = { ...fields, [name]: value };
    const result = registrationSchema.safeParse(partial);
    if (result.success) return undefined;
    const fieldError = result.error.issues.find((e) => e.path[0] === name);
    return fieldError?.message;
  }

  function handleBlur(name: keyof RegistrationFields) {
    const value = fields[name];
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }

  function handleChange(name: keyof RegistrationFields, value: string | boolean) {
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setGlobalError(null);
  }

  // ── OAuth sign-in ───────────────────────────────────────────────────────────

  async function handleGoogleOAuth() {
    setIsOAuthLoading(true);
    setGlobalError(null);

    try {
      const supabase = createClient();
      // Build callback URL with 'next' param for post-login redirect
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (consultationId) {
        callbackUrl.searchParams.set('next', '/profile');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
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

  // ── Email/password registration ─────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    // Full validation
    const result = registrationSchema.safeParse(fields);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof RegistrationFields;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.name,
          email: fields.email,
          password: fields.password,
          lgpdConsent: fields.lgpdConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors((prev) => ({ ...prev, email: data.error }));
        } else {
          setGlobalError(data.error ?? 'Ocorreu um erro. Tente novamente.');
        }
        return;
      }

      // Task 5.1 (Story 8-5): Claim any pending guest consultation data after registration.
      // This is best-effort -- it never blocks the registration flow on failure.
      const claim = await claimGuestSession();
      if (claim.migrated > 0) {
        toast.success('Sua consultoria foi salva no seu perfil!');
      }

      // Success: redirect based on consultation state
      // If a consultation is in progress, route back to the results/consultation page
      // Otherwise go to the profile page
      if (consultationId) {
        router.push(`/consultation/${consultationId}`);
      } else {
        router.push('/profile');
      }
    } catch {
      setGlobalError('Falha na conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
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
            Crie sua conta
          </h1>
          <p className={`text-sm ${mutedTextClass}`}>
            Salve suas consultas e acesse de qualquer dispositivo
          </p>
        </div>

        {/* Card */}
        <div
          className={`rounded-[16px] p-6 shadow-lg ${cardClass}`}
        >
          {/* Global error */}
          {globalError && (
            <div
              role="alert"
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
            onClick={handleGoogleOAuth}
            disabled={isOAuthLoading || isSubmitting}
          >
            {isOAuthLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Continuar com Google
          </Button>

          {/* Divider */}
          <div className={`relative my-5 flex items-center ${dividerClass}`}>
            <div className={`flex-grow border-t ${dividerClass}`} />
            <span className={`mx-3 shrink-0 text-xs ${mutedTextClass}`}>
              ou cadastre-se com e-mail
            </span>
            <div className={`flex-grow border-t ${dividerClass}`} />
          </div>

          {/* Registration Form */}
          <motion.form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name field */}
            <div>
              <label
                htmlFor="reg-name"
                className={`mb-1 block text-sm font-medium ${labelClass}`}
              >
                Nome
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome completo"
                value={fields.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'reg-name-error' : undefined}
                className={`min-h-[48px] w-full rounded-[12px] border px-4 py-3 text-sm outline-none transition-colors ${inputClass} ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.name && (
                <p id="reg-name-error" role="alert" className="mt-1 text-xs text-red-500">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email field */}
            <div>
              <label
                htmlFor="reg-email"
                className={`mb-1 block text-sm font-medium ${labelClass}`}
              >
                E-mail
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={fields.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'reg-email-error' : undefined}
                className={`min-h-[48px] w-full rounded-[12px] border px-4 py-3 text-sm outline-none transition-colors ${inputClass} ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.email && (
                <p id="reg-email-error" role="alert" className="mt-1 text-xs text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="reg-password"
                className={`mb-1 block text-sm font-medium ${labelClass}`}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={fields.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'reg-password-error' : undefined}
                  className={`min-h-[48px] w-full rounded-[12px] border px-4 py-3 pr-12 text-sm outline-none transition-colors ${inputClass} ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${mutedTextClass} hover:opacity-80`}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="reg-password-error" role="alert" className="mt-1 text-xs text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* LGPD Consent Checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="reg-lgpd"
                type="checkbox"
                checked={fields.lgpdConsent}
                onChange={(e) => handleChange('lgpdConsent', e.target.checked)}
                aria-invalid={!!errors.lgpdConsent}
                aria-describedby={errors.lgpdConsent ? 'reg-lgpd-error' : undefined}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-gray-300 accent-current"
                style={{ accentColor }}
              />
              <div>
                <label
                  htmlFor="reg-lgpd"
                  className={`cursor-pointer text-xs leading-relaxed ${mutedTextClass}`}
                >
                  Consinto o processamento dos meus dados conforme a{' '}
                  <Link
                    href="/privacidade"
                    className="underline hover:opacity-80"
                    style={{ color: accentColor }}
                  >
                    Política de Privacidade
                  </Link>
                </label>
                {errors.lgpdConsent && (
                  <p id="reg-lgpd-error" role="alert" className="mt-0.5 text-xs text-red-500">
                    {errors.lgpdConsent}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isSubmitting || isOAuthLoading || !fields.lgpdConsent}
              style={
                !isDark && !isFemale
                  ? {}
                  : { backgroundColor: accentColor, color: isDark ? '#1a1a2e' : '#fff' }
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </motion.form>
        </div>

        {/* Footer link */}
        <p className={`mt-6 text-center text-sm ${mutedTextClass}`}>
          Já tem conta?{' '}
          <Link href="/login" className="font-medium underline hover:opacity-80" style={{ color: accentColor }}>
            Entrar
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
