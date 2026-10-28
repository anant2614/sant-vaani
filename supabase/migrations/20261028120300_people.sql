-- What belongs to each person: settings, saves, notes, path progress and
-- push tokens. Every row is visible only to its owner.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'hi')),
  theme_pref text not null default 'sun' check (theme_pref in ('sun', 'system', 'light', 'dark')),
  city_id text,
  reminder_time time,
  time_zone text,
  -- Accounts are 18+ at launch; the welcome screen asks.
  age_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.saves (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('answer', 'clip', 'verse', 'path')),
  ref text not null check (length(ref) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

-- Notes on Gita verses. Written on the phone first; deleted_at lets a
-- deletion sync to the person's other phones.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scripture_id text not null default 'gita',
  chapter smallint not null,
  verse smallint not null,
  body text not null check (length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (scripture_id, chapter, verse) references public.verses (scripture_id, chapter, verse)
);
create index notes_user_idx on public.notes (user_id, updated_at desc);

create table public.path_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  day smallint not null check (day between 1 and 7),
  completed_at timestamptz not null default now(),
  primary key (user_id, path_id, day)
);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create trigger touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.push_tokens
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.notes enable row level security;
alter table public.path_progress enable row level security;
alter table public.push_tokens enable row level security;

revoke all on table public.profiles, public.saves, public.notes, public.path_progress, public.push_tokens from anon;

create policy "own profile" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on table public.profiles to authenticated;

create policy "own saves" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "own saves insert" on public.saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own saves delete" on public.saves for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on table public.saves to authenticated;

create policy "own notes" on public.notes for select to authenticated using (user_id = (select auth.uid()));
create policy "own notes insert" on public.notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own notes update" on public.notes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notes delete" on public.notes for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on table public.notes to authenticated;

create policy "own progress" on public.path_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "own progress insert" on public.path_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own progress delete" on public.path_progress
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on table public.path_progress to authenticated;

create policy "own push tokens" on public.push_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "own push tokens delete" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on table public.push_tokens to authenticated;

-- A phone's token moves to whoever is signed in on it now.
create function public.register_push_token(token text, platform text) returns void
language sql security definer set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, platform)
  values (register_push_token.token, auth.uid(), register_push_token.platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
