import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Registration input schema.
 * Validates name, email, password (min 8 chars), and LGPD consent.
 */
const registrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  lgpdConsent: z.literal(true, {
    message: 'Você deve aceitar a política de privacidade para continuar',
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

/**
 * POST /api/auth/register
 *
 * Creates a new user account via Supabase Auth.
 * - Validates input with Zod
 * - Creates user via supabase.auth.signUp()
 * - The profiles row is created automatically by a database trigger on auth.users insert
 *
 * Returns:
 *   201 - Registration successful (email verification required)
 *   400 - Validation error or invalid JSON
 *   409 - Email already registered
 *   422 - Weak password rejected by Supabase
 *   500 - Unexpected Supabase error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Requisição inválida' },
      { status: 400 }
    );
  }

  // Validate input
  const parseResult = registrationSchema.safeParse(body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const { name, email, password } = parseResult.data;

  // Create Supabase client (uses cookies for SSR)
  const supabase = await createClient();

  // Register user via Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        display_name: name,
      },
    },
  });

  if (error) {
    return handleSupabaseAuthError(error);
  }

  return NextResponse.json(
    {
      message: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.',
      userId: data.user?.id,
    },
    { status: 201 }
  );
}

/**
 * Maps Supabase auth errors to user-friendly Portuguese messages and HTTP status codes.
 */
function handleSupabaseAuthError(error: { message: string; status?: number; code?: string }): NextResponse {
  const errorMessage = error.message?.toLowerCase() ?? '';
  const errorCode = error.code ?? '';

  // Duplicate email
  if (
    errorCode === 'user_already_exists' ||
    errorMessage.includes('already registered') ||
    errorMessage.includes('already exists')
  ) {
    return NextResponse.json(
      { error: 'Este e-mail já está cadastrado. Tente fazer login.' },
      { status: 409 }
    );
  }

  // Weak password
  if (
    errorCode === 'weak_password' ||
    errorMessage.includes('password') ||
    error.status === 422
  ) {
    return NextResponse.json(
      { error: 'Senha muito fraca. Use no mínimo 8 caracteres.' },
      { status: 422 }
    );
  }

  // Generic error
  return NextResponse.json(
    { error: 'Ocorreu um erro ao criar a conta. Tente novamente.' },
    { status: 500 }
  );
}
