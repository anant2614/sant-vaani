-- What curators build: saints and their channels, YouTube videos, clips,
-- topics, curated questions, answers, steps and paths. Only staff and the
-- server functions read these; the app gets them through the nightly
-- catalogue file.

create table public.saints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text,
  name_hi text,
  initials text not null check (length(initials) between 1 and 3),
  tradition text,
  bio_en text,
  bio_hi text,
  taken_down boolean not null default false,
  taken_down_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(name_en, name_hi) is not null)
);

-- Official channels only. Their uploads are the only source of clips.
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  saint_id uuid not null references public.saints (id) on delete cascade,
  youtube_channel_id text not null unique check (youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  uploads_playlist_id text generated always as ('UU' || substr(youtube_channel_id, 3)) stored,
  handle text,
  title text not null default '',
  rights_basis public.rights_basis not null default 'official_embed',
  active boolean not null default true,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Written permissions and licences, with the signed document in storage.
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  saint_id uuid not null references public.saints (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete set null,
  basis public.rights_basis not null,
  granted_by text not null,
  granted_on date not null,
  expires_on date,
  allows_download boolean not null default false,
  terms text not null default '',
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- YouTube facts, refreshed from the Data API at least every 30 days.
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  youtube_id text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null default '',
  description text not null default '',
  published_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  chapters jsonb not null default '[]'::jsonb,
  embeddable boolean not null default true,
  privacy_status text not null default 'public' check (privacy_status in ('public', 'unlisted', 'private', 'gone')),
  status public.video_status not null default 'new',
  -- Where the overnight model suggests looking: [{topic_slug, start, end, reason}].
  suggestions jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_status_idx on public.videos (status, published_at desc);
create index videos_fetched_at_idx on public.videos (fetched_at);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  group_slug text not null check (group_slug in ('mind', 'relationships', 'work', 'hardship', 'spirit')),
  name_en text not null,
  name_hi text not null,
  -- Grief, self-harm, family conflict: clips need a second reviewer.
  sensitive boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Curated questions. Ask only ever matches to these.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  text_en text,
  text_hi text,
  -- Other ways people ask it, in English, Hindi or Hinglish.
  phrasings text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(text_en, text_hi) is not null)
);
create index questions_topic_idx on public.questions (topic_id);

-- One small practice, shown after an answer or on a path day.
create table public.steps (
  id uuid primary key default gen_random_uuid(),
  text_en text,
  text_hi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(text_en, text_hi) is not null)
);

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete restrict,
  -- Copied from the video's channel by a trigger.
  saint_id uuid not null references public.saints (id) on delete restrict,
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer not null,
  language public.clip_language not null,
  summary_en text,
  summary_hi text,
  sensitive boolean not null default false,
  status public.clip_status not null default 'draft',
  created_by uuid references public.staff (user_id) on delete set null,
  reviewed_by uuid references public.staff (user_id) on delete set null,
  approved_at timestamptz,
  retired_at timestamptz,
  retired_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_seconds - start_seconds between 15 and 900),
  check (coalesce(summary_en, summary_hi) is not null)
);
create index clips_video_idx on public.clips (video_id);
create index clips_saint_idx on public.clips (saint_id);
create index clips_status_idx on public.clips (status);

create table public.clip_topics (
  clip_id uuid not null references public.clips (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (clip_id, topic_id)
);
create index clip_topics_topic_idx on public.clip_topics (topic_id);

-- One answer per curated question: 3 to 5 clips by different saints,
-- a Gita verse that ties them together and one small step.
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  scripture_id text not null default 'gita',
  verse_chapter smallint,
  verse_number smallint,
  step_id uuid references public.steps (id) on delete set null,
  status public.answer_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.staff (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (scripture_id, verse_chapter, verse_number) references public.verses (scripture_id, chapter, verse),
  check ((verse_chapter is null) = (verse_number is null))
);

create table public.answer_clips (
  answer_id uuid not null references public.answers (id) on delete cascade,
  clip_id uuid not null references public.clips (id) on delete restrict,
  position smallint not null check (position between 1 and 5),
  primary key (answer_id, clip_id),
  unique (answer_id, position) deferrable initially deferred
);
create index answer_clips_clip_idx on public.answer_clips (clip_id);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_en text not null,
  title_hi text not null,
  description_en text not null,
  description_hi text not null,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.path_days (
  path_id uuid not null references public.paths (id) on delete cascade,
  day smallint not null check (day between 1 and 7),
  clip_id uuid references public.clips (id) on delete set null,
  scripture_id text not null default 'gita',
  verse_chapter smallint,
  verse_number smallint,
  step_id uuid references public.steps (id) on delete set null,
  primary key (path_id, day),
  foreign key (scripture_id, verse_chapter, verse_number) references public.verses (scripture_id, chapter, verse),
  check ((verse_chapter is null) = (verse_number is null))
);

-- Overnight clip-suggestion batches sent to the Claude Batch API.
create table public.suggestion_batches (
  id uuid primary key default gen_random_uuid(),
  anthropic_batch_id text not null unique,
  status text not null default 'submitted' check (status in ('submitted', 'processed', 'failed')),
  video_ids uuid[] not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'saints', 'channels', 'permissions', 'videos', 'topics', 'questions', 'steps', 'clips',
    'answers', 'paths'
  ] loop
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t
    );
  end loop;

  foreach t in array array[
    'saints', 'channels', 'permissions', 'videos', 'topics', 'questions', 'steps', 'clips', 'clip_topics',
    'answers', 'answer_clips', 'paths', 'path_days', 'suggestion_batches', 'daily_verses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format(
      'create policy "staff manage %1$s" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())',
      t
    );
  end loop;
end
$$;
