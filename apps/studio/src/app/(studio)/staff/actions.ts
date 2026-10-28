'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/actions';
import { requireStaff, type StaffRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

const ROLES = ['curator', 'reviewer', 'admin'] as const;

const staffFormSchema = z.object({
  email: z.email('Enter the email they sign in with.'),
  role: z.enum(ROLES),
  displayName: z.string().trim().min(1, 'Add the name others will see.').max(80),
});

async function requireAdmin() {
  const session = await requireStaff();
  return session.staff.role === 'admin' ? session : null;
}

/** Adds someone who has signed in to the studio once. */
export async function addStaff(_state: ActionState, data: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: 'Only an admin can add staff.' };
  const parsed = staffFormSchema.safeParse({
    email: String(data.get('email') ?? '').trim(),
    role: data.get('role'),
    displayName: data.get('displayName'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  const { error } = await session.supabase.rpc('add_staff', {
    email: parsed.data.email,
    role: parsed.data.role,
    display_name: parsed.data.displayName,
  });
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: `${parsed.data.displayName} can now use the studio.` };
}

export async function setRole(userId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: 'Only an admin can change roles.' };
  const role = z.enum(ROLES).safeParse(data.get('role'));
  if (!role.success) return { error: 'Choose a role.' };
  if (userId === session.staff.userId && role.data !== 'admin') {
    return { error: 'Ask another admin to change your own role, so the studio always keeps an admin.' };
  }
  const { error } = await session.supabase.from('staff').update({ role: role.data as StaffRole }).eq('user_id', userId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Role changed.' };
}

export async function removeStaff(userId: string, _state: ActionState): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: 'Only an admin can remove staff.' };
  if (userId === session.staff.userId) return { error: 'You cannot remove yourself.' };
  const { error } = await session.supabase.from('staff').delete().eq('user_id', userId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Removed. Their clips stay.' };
}
