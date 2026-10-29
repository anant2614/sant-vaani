-- What Curator Studio needs beyond plain table access: one transaction for
-- saving a clip with its topics and for saving an answer with its clips,
-- a read model of clips for the screens, and a second review whenever an
-- approved sensitive clip is edited by someone who cannot give it.

-- Clips that may be shown, and why the others may not, for the studio.
create view public.clip_cards with (security_invoker = true) as
  select
    c.id,
    c.video_id,
    c.saint_id,
    c.start_seconds,
    c.end_seconds,
    c.language,
    c.summary_en,
    c.summary_hi,
    c.sensitive,
    c.status,
    c.created_by,
    c.reviewed_by,
    c.approved_at,
    c.retired_reason,
    c.created_at,
    (c.status = 'approved' and not s.taken_down and v.embeddable and v.privacy_status in ('public', 'unlisted')) as live,
    coalesce(s.name_en, s.name_hi) as saint_name,
    s.taken_down as saint_taken_down,
    v.youtube_id,
    v.title as video_title,
    v.embeddable as video_embeddable,
    v.privacy_status as video_privacy_status,
    coalesce((select array_agg(ct.topic_id) from public.clip_topics ct where ct.clip_id = c.id), '{}') as topic_ids,
    (select st.display_name from public.staff st where st.user_id = c.created_by) as created_by_name
  from public.clips c
  join public.saints s on s.id = c.saint_id
  join public.videos v on v.id = c.video_id;

revoke all on public.clip_cards from anon;
grant select on public.clip_cards to authenticated;

-- One definition of "live" for answers, the catalogue and the studio.
create or replace view public.live_clips with (security_invoker = true) as
  select c.*
  from public.clips c
  join public.clip_cards cc on cc.id = c.id
  where cc.live;

-- Clips ---------------------------------------------------------------------

create or replace function public.clips_before_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  edited boolean := false;
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(uid, new.created_by);
    select ch.saint_id into new.saint_id
      from public.videos v join public.channels ch on ch.id = v.channel_id
      where v.id = new.video_id;
  else
    if new.video_id is distinct from old.video_id then
      raise exception 'a clip cannot move to another video';
    end if;
    -- The saint comes from the video's channel, and the maker and reviewer
    -- from who did the work, so a direct update cannot rewrite them.
    -- Removing a staff member still clears their name (on delete set null).
    if new.saint_id is distinct from old.saint_id then
      raise exception 'a clip''s saint comes from its video and cannot be changed' using errcode = 'check_violation';
    end if;
    if (new.created_by is distinct from old.created_by
        and (new.created_by is not null or exists (select 1 from public.staff where user_id = old.created_by)))
      or (new.reviewed_by is distinct from old.reviewed_by
        and (new.reviewed_by is not null or exists (select 1 from public.staff where user_id = old.reviewed_by)))
    then
      raise exception 'who made and who approved a clip cannot be changed' using errcode = 'check_violation';
    end if;
    -- A sensitive topic keeps a clip sensitive, and only a reviewer or
    -- admin can take the mark off.
    new.sensitive := new.sensitive or exists (
      select 1 from public.clip_topics ct join public.topics t on t.id = ct.topic_id
      where ct.clip_id = new.id and t.sensitive
    );
    if old.sensitive and not new.sensitive and uid is not null
      and not exists (select 1 from public.staff where user_id = uid and role in ('reviewer', 'admin')) then
      raise exception 'only a reviewer or admin can mark a clip as not sensitive' using errcode = 'check_violation';
    end if;
    -- A person changed what the clip shows or says.
    edited := uid is not null
      and (new.start_seconds, new.end_seconds, new.summary_en, new.summary_hi)
        is distinct from (old.start_seconds, old.end_seconds, old.summary_en, old.summary_hi);
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.reviewed_by := coalesce(uid, new.reviewed_by);
    new.approved_at := now();
    if new.sensitive then
      if new.reviewed_by is null or new.reviewed_by = new.created_by then
        raise exception 'a clip on a sensitive topic needs a second reviewer who did not make it'
          using errcode = 'check_violation';
      end if;
      if not exists (select 1 from public.staff where user_id = new.reviewed_by and role in ('reviewer', 'admin')) then
        raise exception 'only a reviewer or admin can approve a clip on a sensitive topic'
          using errcode = 'check_violation';
      end if;
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'approved' and new.sensitive and (
    -- Became sensitive after an approval that was not a second review.
    (not old.sensitive and (new.reviewed_by is null or new.reviewed_by = new.created_by
      or not exists (select 1 from public.staff where user_id = new.reviewed_by and role in ('reviewer', 'admin'))))
    -- Edited by its maker, or by someone who cannot give the second review.
    or (edited and (uid = new.created_by
      or not exists (select 1 from public.staff where user_id = uid and role in ('reviewer', 'admin')))))
  then
    new.status := 'needs_second_review';
    new.approved_at := null;
  elsif tg_op = 'UPDATE' and new.status = 'approved' and edited then
    -- Whoever edits an approved clip approves the new version.
    new.reviewed_by := uid;
    new.approved_at := now();
  end if;

  if new.status = 'retired' and new.retired_at is null then
    new.retired_at := now();
  end if;
  return new;
end
$$;

-- Saves a clip and its topics together. Submitting approves it, or sends
-- it to a second review when it is sensitive and the person saving it
-- made it or is not a reviewer.
create function public.save_clip(
  clip_id uuid,
  video_id uuid,
  start_seconds integer,
  end_seconds integer,
  language public.clip_language,
  summary_en text,
  summary_hi text,
  sensitive boolean,
  topic_ids uuid[],
  submit boolean
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  saved_id uuid := save_clip.clip_id;
  existing public.clips;
  is_sensitive boolean;
  next_status public.clip_status;
begin
  if coalesce(array_length(save_clip.topic_ids, 1), 0) = 0 then
    raise exception 'choose at least one topic' using errcode = 'check_violation';
  end if;

  if saved_id is not null then
    select * into existing from public.clips c where c.id = saved_id;
    if not found then
      raise exception 'clip % not found', saved_id using errcode = 'no_data_found';
    end if;
    if existing.status = 'retired' then
      raise exception 'a retired clip cannot be edited; make a new clip instead' using errcode = 'check_violation';
    end if;
    if existing.video_id <> save_clip.video_id then
      raise exception 'a clip cannot move to another video' using errcode = 'check_violation';
    end if;
  end if;

  is_sensitive := save_clip.sensitive
    or exists (select 1 from public.topics t where t.id = any (save_clip.topic_ids) and t.sensitive);

  if not save_clip.submit then
    next_status := 'draft';
  elsif is_sensitive and (
    uid is null
    or uid = coalesce(existing.created_by, uid)
    or not exists (select 1 from public.staff s where s.user_id = uid and s.role in ('reviewer', 'admin'))
  ) then
    next_status := 'needs_second_review';
  else
    next_status := 'approved';
  end if;

  if saved_id is null then
    insert into public.clips (video_id, start_seconds, end_seconds, language, summary_en, summary_hi, sensitive, status)
    values (
      save_clip.video_id, save_clip.start_seconds, save_clip.end_seconds, save_clip.language,
      save_clip.summary_en, save_clip.summary_hi, is_sensitive, next_status
    )
    returning id into saved_id;
  end if;

  -- Topics first, so an edit is checked against the topics it ends with.
  delete from public.clip_topics ct where ct.clip_id = saved_id and ct.topic_id <> all (save_clip.topic_ids);
  insert into public.clip_topics (clip_id, topic_id)
    select saved_id, t from unnest(save_clip.topic_ids) as t
    on conflict do nothing;

  if save_clip.clip_id is not null then
    update public.clips c
      set start_seconds = save_clip.start_seconds,
          end_seconds = save_clip.end_seconds,
          language = save_clip.language,
          summary_en = save_clip.summary_en,
          summary_hi = save_clip.summary_hi,
          sensitive = is_sensitive,
          status = next_status
      where c.id = saved_id;
  end if;
  return saved_id;
end
$$;

-- Answers -------------------------------------------------------------------

-- Taking clips out while save_answer() rewrites them is not a removal.
create or replace function public.answer_clips_after_delete() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(current_setting('sant_vaani.saving_answer', true), '') = 'on' then
    return null;
  end if;
  update public.answers a
    set status = 'needs_replacement'
    where a.id = old.answer_id
      and a.status = 'published'
      and (select count(*) from public.answer_clips where answer_id = old.answer_id) < 3;
  return null;
end
$$;

-- Saves a question's answer: its clips in order, verse and step. A
-- published answer must still pass publish_answer(), or nothing is saved.
create function public.save_answer(
  question_id uuid,
  clip_ids uuid[],
  verse_chapter smallint,
  verse_number smallint,
  step_id uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  saved public.answers;
  i integer;
begin
  insert into public.answers as a (question_id, verse_chapter, verse_number, step_id)
  values (save_answer.question_id, save_answer.verse_chapter, save_answer.verse_number, save_answer.step_id)
  on conflict on constraint answers_question_id_key do update
    set verse_chapter = excluded.verse_chapter,
        verse_number = excluded.verse_number,
        step_id = excluded.step_id
  returning a.* into saved;

  perform set_config('sant_vaani.saving_answer', 'on', true);
  delete from public.answer_clips ac where ac.answer_id = saved.id;
  for i in 1 .. coalesce(array_length(save_answer.clip_ids, 1), 0) loop
    insert into public.answer_clips (answer_id, clip_id, position)
    values (saved.id, save_answer.clip_ids[i], i);
  end loop;
  perform set_config('sant_vaani.saving_answer', '', true);

  if saved.status = 'published' then
    perform public.publish_answer(saved.id);
  end if;
  return saved.id;
end
$$;

revoke execute on function public.save_clip(uuid, uuid, integer, integer, public.clip_language, text, text, boolean, uuid[], boolean)
  from public, anon;
revoke execute on function public.save_answer(uuid, uuid[], smallint, smallint, uuid) from public, anon;
grant execute on function public.save_clip(uuid, uuid, integer, integer, public.clip_language, text, text, boolean, uuid[], boolean)
  to authenticated, service_role;
grant execute on function public.save_answer(uuid, uuid[], smallint, smallint, uuid) to authenticated, service_role;
