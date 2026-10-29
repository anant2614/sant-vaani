-- Core types, the staff list and helpers that later migrations use.

create type public.rights_basis as enum ('official_embed', 'written_permission', 'license');
create type public.clip_status as enum ('draft', 'needs_second_review', 'approved', 'retired');
create type public.answer_status as enum ('draft', 'published', 'needs_replacement');
create type public.video_status as enum ('new', 'suggesting', 'suggested', 'done', 'ignored');
create type public.staff_role as enum ('curator', 'reviewer', 'admin');
create type public.clip_language as enum ('hi', 'en', 'mixed', 'other');

-- Curators, reviewers and admins of Curator Studio. Everyone else is an app user.
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null default 'curator',
  display_name text not null check (length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()))
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()) and role = 'admin')
$$;

-- Staff, the server functions (service role) and direct database sessions
-- such as cron, migrations and seeds. A request from the app always
-- carries a role claim, so it never falls through to the last case.
create function public.can_curate() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.role(), 'service_role') = 'service_role' or public.is_staff()
$$;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create policy "staff see the staff list" on public.staff
  for select to authenticated using (public.is_staff());
create policy "admins manage staff" on public.staff
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on table public.staff from anon;
grant select, insert, update, delete on table public.staff to authenticated;
