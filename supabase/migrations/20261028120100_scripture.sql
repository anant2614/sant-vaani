-- Scripture text. The app carries the Gita in its own SQLite file; these
-- tables let answers, paths and notes point at verses, and hold meanings
-- once they are written or licensed.

create table public.scriptures (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_hi text not null,
  name_sa text not null
);

create table public.chapters (
  scripture_id text not null references public.scriptures (id) on delete cascade,
  number smallint not null check (number > 0),
  name_sa text not null,
  name_iast text not null,
  name_en text not null,
  verse_count smallint not null check (verse_count > 0),
  primary key (scripture_id, number)
);

create table public.verses (
  scripture_id text not null,
  chapter smallint not null,
  verse smallint not null check (verse > 0),
  speaker_sa text,
  speaker_iast text,
  sanskrit text not null,
  transliteration text not null,
  meaning_en text,
  meaning_hi text,
  primary key (scripture_id, chapter, verse),
  foreign key (scripture_id, chapter) references public.chapters (scripture_id, number) on delete cascade
);

-- Verses that Today rotates through.
create table public.daily_verses (
  scripture_id text not null default 'gita',
  chapter smallint not null,
  verse smallint not null,
  sort_order integer not null default 0,
  primary key (scripture_id, chapter, verse),
  foreign key (scripture_id, chapter, verse) references public.verses (scripture_id, chapter, verse) on delete cascade
);

alter table public.scriptures enable row level security;
alter table public.chapters enable row level security;
alter table public.verses enable row level security;
alter table public.daily_verses enable row level security;

create policy "anyone reads scriptures" on public.scriptures for select to anon, authenticated using (true);
create policy "anyone reads chapters" on public.chapters for select to anon, authenticated using (true);
create policy "anyone reads verses" on public.verses for select to anon, authenticated using (true);
create policy "staff update meanings" on public.verses
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

revoke all on table public.scriptures, public.chapters, public.verses from anon, authenticated;
grant select on table public.scriptures, public.chapters, public.verses to anon, authenticated;
grant update (meaning_en, meaning_hi) on table public.verses to authenticated;
