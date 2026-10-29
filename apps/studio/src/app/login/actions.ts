'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { step: 'email' | 'code'; email?: string; error?: string; notice?: string };

const emailSchema = z.email();

/**
 * Sign-in with a one-time code by email. Anyone can get a code; only
 * people on the staff list get past the next page.
 */
export async function signIn(previous: LoginState, data: FormData): Promise<LoginState> {
  const intent = String(data.get('intent') ?? 'send');
  const supabase = await createClient();

  if (intent === 'restart') return { step: 'email' };

  if (intent === 'send') {
    const email = String(data.get('email') ?? previous.email ?? '').trim().toLowerCase();
    if (!emailSchema.safeParse(email).success) return { step: 'email', email, error: 'Enter your email address.' };
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) return { step: 'email', email, error: friendlyError(error.message) };
    return { step: 'code', email, notice: `We sent a sign-in code to ${email}. It works for an hour.` };
  }

  const email = previous.email ?? '';
  const token = String(data.get('code') ?? '').replace(/\s+/g, '');
  if (!/^\d{6,10}$/.test(token)) return { step: 'code', email, error: 'Enter the code from the email.' };
  const { data: session, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !session.user) {
    return { step: 'code', email, error: 'That code did not work. Check it, or send a new one.' };
  }

  const { data: staff } = await supabase.from('staff').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) redirect('/login?reason=not-staff');
  redirect('/');
}
