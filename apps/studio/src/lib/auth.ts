import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';

export type StaffRole = 'curator' | 'reviewer' | 'admin';
export type Staff = { userId: string; role: StaffRole; displayName: string };

/**
 * The signed-in staff member and a client acting as them. Anyone else is
 * sent to /login. Call it at the top of every page and server action; it
 * runs once per request.
 */
export const requireStaff = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || data?.claims?.is_anonymous === true) redirect('/login');

  const { data: row } = await supabase
    .from('staff')
    .select('role, display_name')
    .eq('user_id', userId)
    .maybeSingle<{ role: StaffRole; display_name: string }>();
  if (!row) redirect('/login?reason=not-staff');

  const staff: Staff = { userId, role: row.role, displayName: row.display_name };
  return { supabase, staff };
});

export function canReview(staff: Staff) {
  return staff.role === 'reviewer' || staff.role === 'admin';
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  curator: 'Curator',
  reviewer: 'Reviewer',
  admin: 'Admin',
};
