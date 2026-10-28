-- Ask: each person's question history, the backlog of questions nothing
-- matched well, "tell me when it's answered" requests and daily limits.
-- Only the ask server function writes here.

-- Questions nobody has answered yet, grouped by their normalized text.
-- No user is linked to a backlog item.
create table public.backlog_items (
  id uuid primary key default gen_random_uuid(),
  normalized text not null unique,
  example text not null check (length(example) <= 500),
  topic_slugs text[] not null default '{}',
  ask_count integer not null default 1,
  first_asked_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  question_id uuid references public.questions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index backlog_open_idx on public.backlog_items (status, ask_count desc);
create trigger touch_updated_at before update on public.backlog_items
  for each row execute function public.touch_updated_at();

create table public.asks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Never stored for a crisis.
  question text check (length(question) <= 500),
  language text check (language in ('en', 'hi', 'hinglish', 'other')),
  result text not null check (result in ('answer', 'nearest', 'crisis', 'limited')),
  question_id uuid references public.questions (id) on delete set null,
  confidence real,
  topic_slugs text[] not null default '{}',
  matcher text not null check (matcher in ('model', 'lexical', 'none')),
  backlog_id uuid references public.backlog_items (id) on delete set null,
  created_at timestamptz not null default now(),
  check (result <> 'crisis' or question is null)
);
create index asks_user_idx on public.asks (user_id, created_at desc);

create table public.notify_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  backlog_id uuid not null references public.backlog_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (user_id, backlog_id)
);

create table public.ask_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.backlog_items enable row level security;
alter table public.asks enable row level security;
alter table public.notify_requests enable row level security;
alter table public.ask_usage enable row level security;

revoke all on table public.backlog_items, public.asks, public.notify_requests, public.ask_usage from anon;

create policy "staff manage backlog" on public.backlog_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on table public.backlog_items to authenticated;

create policy "own asks" on public.asks for select to authenticated using (user_id = (select auth.uid()));
create policy "own asks delete" on public.asks for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on table public.asks to authenticated;

create policy "own notify requests" on public.notify_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own notify requests insert" on public.notify_requests
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own notify requests delete" on public.notify_requests
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on table public.notify_requests to authenticated;

revoke all on table public.ask_usage from authenticated;

-- Counts one ask for today (India time) and says whether it is within the limit.
create function public.bump_ask_usage(user_id uuid, max integer) returns boolean
language sql security definer set search_path = ''
as $$
  insert into public.ask_usage as u (user_id, day, count)
  values (bump_ask_usage.user_id, (now() at time zone 'Asia/Kolkata')::date, 1)
  on conflict on constraint ask_usage_pkey do update set count = u.count + 1
  returning count <= bump_ask_usage.max
$$;

-- Adds a question to the backlog, or counts it again if already there.
create function public.record_backlog(normalized text, example text, topic_slugs text[]) returns uuid
language sql security definer set search_path = ''
as $$
  insert into public.backlog_items as b (normalized, example, topic_slugs)
  values (record_backlog.normalized, record_backlog.example, record_backlog.topic_slugs)
  on conflict (normalized) do update
    set ask_count = b.ask_count + 1,
        last_asked_at = now(),
        example = excluded.example,
        topic_slugs = excluded.topic_slugs
  returning id
$$;

revoke execute on function public.bump_ask_usage(uuid, integer) from public, anon, authenticated;
revoke execute on function public.record_backlog(text, text, text[]) from public, anon, authenticated;
grant execute on function public.bump_ask_usage(uuid, integer) to service_role;
grant execute on function public.record_backlog(text, text, text[]) to service_role;
