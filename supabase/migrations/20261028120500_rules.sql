-- The curation rules, enforced in the database so no screen can skip them:
--   * a clip keeps the saint of its video's channel;
--   * a clip on a sensitive topic needs a second reviewer who did not make it;
--   * an answer has 3 to 5 live clips by different saints, a verse and a step;
--   * a retired clip or a taken-down saint flags its answers for replacement;
--   * only admins take a saint down.

-- Clips ---------------------------------------------------------------------

create function public.clips_before_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(uid, new.created_by);
    select ch.saint_id into new.saint_id
      from public.videos v join public.channels ch on ch.id = v.channel_id
      where v.id = new.video_id;
  elsif new.video_id is distinct from old.video_id then
    raise exception 'a clip cannot move to another video';
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
  elsif tg_op = 'UPDATE' and new.status = 'approved' and new.sensitive and not old.sensitive
    and (new.reviewed_by is null or new.reviewed_by = new.created_by) then
    -- Became sensitive after approval: back to the second-review queue.
    new.status := 'needs_second_review';
    new.approved_at := null;
  end if;

  if new.status = 'retired' and new.retired_at is null then
    new.retired_at := now();
  end if;
  return new;
end
$$;

create trigger clips_before_write
  before insert or update on public.clips
  for each row execute function public.clips_before_write();

-- A sensitive topic makes its clips sensitive.
create function public.clip_topics_after_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.topics where id = new.topic_id and sensitive) then
    update public.clips set sensitive = true where id = new.clip_id and not sensitive;
  end if;
  return null;
end
$$;

create trigger clip_topics_after_insert
  after insert on public.clip_topics
  for each row execute function public.clip_topics_after_insert();

-- Clips that may be shown: approved, saint not taken down, video still
-- public or unlisted and embeddable.
create view public.live_clips with (security_invoker = true) as
  select c.*
  from public.clips c
  join public.saints s on s.id = c.saint_id
  join public.videos v on v.id = c.video_id
  where c.status = 'approved'
    and not s.taken_down
    and v.embeddable
    and v.privacy_status in ('public', 'unlisted');

revoke all on public.live_clips from anon;
grant select on public.live_clips to authenticated;

-- Answers -------------------------------------------------------------------

create function public.answer_clips_before_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  clip_saint uuid;
begin
  select saint_id into clip_saint from public.clips where id = new.clip_id;
  if exists (
    select 1
    from public.answer_clips ac
    join public.clips c on c.id = ac.clip_id
    where ac.answer_id = new.answer_id and ac.clip_id <> new.clip_id and c.saint_id = clip_saint
  ) then
    raise exception 'this answer already has a clip by that saint' using errcode = 'unique_violation';
  end if;
  if (select count(*) from public.answer_clips where answer_id = new.answer_id and clip_id <> new.clip_id) >= 5 then
    raise exception 'an answer can have at most 5 clips' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger answer_clips_before_write
  before insert or update on public.answer_clips
  for each row execute function public.answer_clips_before_write();

-- Taking a clip out of a published answer that leaves fewer than 3 flags it.
create function public.answer_clips_after_delete() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.answers a
    set status = 'needs_replacement'
    where a.id = old.answer_id
      and a.status = 'published'
      and (select count(*) from public.answer_clips where answer_id = old.answer_id) < 3;
  return null;
end
$$;

create trigger answer_clips_after_delete
  after delete on public.answer_clips
  for each row execute function public.answer_clips_after_delete();

-- Publishing goes through publish_answer(), which checks the rules.
create function public.answers_before_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published'
    and coalesce(current_setting('sant_vaani.publishing', true), '') <> 'on' then
    raise exception 'publish an answer with publish_answer()' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger answers_before_update
  before update on public.answers
  for each row execute function public.answers_before_update();

create function public.answers_before_insert() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'published' then
    raise exception 'publish an answer with publish_answer()' using errcode = 'check_violation';
  end if;
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end
$$;

create trigger answers_before_insert
  before insert on public.answers
  for each row execute function public.answers_before_insert();

create function public.publish_answer(answer_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.answers;
  clip_count integer;
  saint_count integer;
  live_count integer;
begin
  if not public.can_curate() then
    raise exception 'only staff can publish answers' using errcode = 'insufficient_privilege';
  end if;

  select * into a from public.answers where id = publish_answer.answer_id for update;
  if not found then
    raise exception 'answer % not found', publish_answer.answer_id using errcode = 'no_data_found';
  end if;

  select count(*), count(distinct c.saint_id), count(lc.id)
    into clip_count, saint_count, live_count
    from public.answer_clips ac
    join public.clips c on c.id = ac.clip_id
    left join public.live_clips lc on lc.id = c.id
    where ac.answer_id = publish_answer.answer_id;

  if clip_count < 3 or clip_count > 5 then
    raise exception 'an answer needs 3 to 5 clips; this one has %', clip_count using errcode = 'check_violation';
  end if;
  if saint_count < clip_count then
    raise exception 'each clip in an answer must be by a different saint' using errcode = 'check_violation';
  end if;
  if live_count < clip_count then
    raise exception 'every clip in an answer must be approved and live' using errcode = 'check_violation';
  end if;
  if a.verse_chapter is null then
    raise exception 'an answer needs a Gita verse' using errcode = 'check_violation';
  end if;
  if a.step_id is null then
    raise exception 'an answer needs a small step' using errcode = 'check_violation';
  end if;

  perform set_config('sant_vaani.publishing', 'on', true);
  update public.answers
    set status = 'published', published_at = coalesce(published_at, now())
    where id = publish_answer.answer_id;
  perform set_config('sant_vaani.publishing', '', true);
end
$$;

-- Retiring and takedowns ------------------------------------------------------

create function public.retire_clip(clip_id uuid, reason text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_curate() then
    raise exception 'only staff can retire clips' using errcode = 'insufficient_privilege';
  end if;
  update public.clips
    set status = 'retired', retired_at = now(), retired_reason = retire_clip.reason
    where id = retire_clip.clip_id and status <> 'retired';
  update public.answers a
    set status = 'needs_replacement'
    where a.status = 'published'
      and exists (select 1 from public.answer_clips ac where ac.answer_id = a.id and ac.clip_id = retire_clip.clip_id);
end
$$;

create function public.saints_before_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.taken_down is distinct from old.taken_down
    and not (public.is_admin() or coalesce(auth.role(), 'service_role') = 'service_role') then
    raise exception 'only an admin can take a saint down or restore one' using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$$;

create trigger saints_before_update
  before update on public.saints
  for each row execute function public.saints_before_update();

-- A channel's clips carry its saint, so it cannot move once it has any.
create function public.channels_before_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.saint_id is distinct from old.saint_id and exists (
    select 1 from public.clips c join public.videos v on v.id = c.video_id where v.channel_id = new.id
  ) then
    raise exception 'a channel with clips cannot move to another saint' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger channels_before_update
  before update on public.channels
  for each row execute function public.channels_before_update();

-- One switch hides every clip of a saint, for a takedown request.
create function public.set_saint_takedown(saint_id uuid, hidden boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or coalesce(auth.role(), 'service_role') = 'service_role') then
    raise exception 'only an admin can take a saint down or restore one' using errcode = 'insufficient_privilege';
  end if;
  update public.saints
    set taken_down = hidden, taken_down_at = case when hidden then now() end
    where id = set_saint_takedown.saint_id;
  if hidden then
    update public.answers a
      set status = 'needs_replacement'
      where a.status = 'published'
        and exists (
          select 1
          from public.answer_clips ac
          join public.clips c on c.id = ac.clip_id
          where ac.answer_id = a.id and c.saint_id = set_saint_takedown.saint_id
        );
  end if;
end
$$;

-- Accounts ---------------------------------------------------------------------

-- Deletes the signed-in person and, by cascade, their profile, saves,
-- notes, path progress, question history and push tokens.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = uid;
end
$$;

revoke execute on function public.publish_answer(uuid) from public, anon;
revoke execute on function public.retire_clip(uuid, text) from public, anon;
revoke execute on function public.set_saint_takedown(uuid, boolean) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.publish_answer(uuid) to authenticated, service_role;
grant execute on function public.retire_clip(uuid, text) to authenticated, service_role;
grant execute on function public.set_saint_takedown(uuid, boolean) to authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated;
