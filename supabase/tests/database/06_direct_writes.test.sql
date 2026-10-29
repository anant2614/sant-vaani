-- Direct writes: anything a staff member can send to the API with their own
-- session, around the studio's screens, still has to meet the curation rules.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'curator@example.com'),
  ('00000000-0000-4000-8000-000000000012', 'curator2@example.com'),
  ('00000000-0000-4000-8000-000000000021', 'reviewer@example.com'),
  ('00000000-0000-4000-8000-000000000031', 'admin@example.com');
insert into public.staff (user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000011', 'curator', 'Curator'),
  ('00000000-0000-4000-8000-000000000012', 'curator', 'Second curator'),
  ('00000000-0000-4000-8000-000000000021', 'reviewer', 'Reviewer'),
  ('00000000-0000-4000-8000-000000000031', 'admin', 'Admin');

-- Two saints, one channel and one video each.
insert into public.saints (id, slug, name_en, initials)
select ('aaaaaaaa-0000-4000-8000-00000000000' || n)::uuid, 'sample-saint-' || n, 'Sample Saint ' || n, 'S' || n
from generate_series(1, 2) n;
insert into public.channels (id, saint_id, youtube_channel_id)
select ('cccccccc-0000-4000-8000-00000000000' || n)::uuid, ('aaaaaaaa-0000-4000-8000-00000000000' || n)::uuid,
  'UC' || repeat(n::text, 22)
from generate_series(1, 2) n;
insert into public.videos (id, channel_id, youtube_id)
select ('dddddddd-0000-4000-8000-00000000000' || n)::uuid, ('cccccccc-0000-4000-8000-00000000000' || n)::uuid,
  repeat(n::text, 11)
from generate_series(1, 2) n;
insert into public.topics (id, slug, group_slug, name_en, name_hi, sensitive) values
  ('ffffffff-0000-4000-8000-000000000001', 'test-calm', 'mind', 'Calm', 'शांति', false),
  ('ffffffff-0000-4000-8000-000000000002', 'test-grief', 'hardship', 'Grief', 'शोक', true);

-- The first curator makes four clips from saint 1's video: e1 approved on
-- calm, e2 waiting for review on grief, e3 waiting because they marked it
-- sensitive themselves, and e4 a draft on calm.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
insert into public.clips (id, video_id, start_seconds, end_seconds, language, summary_en, sensitive, status) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 0, 60, 'hi', 'Clip one', false, 'approved'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 60, 120, 'hi', 'Clip two', true, 'needs_second_review'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000001', 120, 180, 'hi', 'Clip three', true, 'needs_second_review'),
  ('eeeeeeee-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000001', 180, 240, 'hi', 'Clip four', false, 'draft');
insert into public.clip_topics (clip_id, topic_id) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001'),
  ('eeeeeeee-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000001');

-- Who said it --------------------------------------------------------------
select throws_like(
  $$ update public.clips set saint_id = 'aaaaaaaa-0000-4000-8000-000000000002'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '%saint comes from its video%',
  'a curator cannot move a clip to another saint'
);
select throws_like(
  $$ update public.channels set saint_id = 'aaaaaaaa-0000-4000-8000-000000000002'
     where id = 'cccccccc-0000-4000-8000-000000000001' $$,
  '%channel with clips%',
  'a channel with clips cannot move to another saint'
);
select lives_ok(
  $$ update public.channels set saint_id = 'aaaaaaaa-0000-4000-8000-000000000001'
     where id = 'cccccccc-0000-4000-8000-000000000002' $$,
  'a channel without clips can still be moved, to correct a mistake'
);

-- Who made and who approved it ----------------------------------------------
select throws_like(
  $$ update public.clips set reviewed_by = '00000000-0000-4000-8000-000000000021'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '%cannot be changed%',
  'a curator cannot name someone else as a clip''s reviewer'
);
select throws_like(
  $$ update public.clips set created_by = '00000000-0000-4000-8000-000000000012'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '%cannot be changed%',
  'a curator cannot name someone else as a clip''s maker'
);

-- The second review ----------------------------------------------------------
select throws_like(
  $$ update public.clips set sensitive = false, status = 'approved'
     where id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  '%second reviewer%',
  'a curator cannot approve their own clip on a sensitive topic by clearing its flag'
);
select throws_like(
  $$ update public.clips set sensitive = false where id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  '%only a reviewer or admin can mark a clip as not sensitive%',
  'a curator cannot take the sensitive mark off a clip'
);

-- The second curator approves the draft, which is allowed while it is not
-- sensitive, then gives it a sensitive topic.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000012", "role": "authenticated"}';
update public.clips set status = 'approved' where id = 'eeeeeeee-0000-4000-8000-000000000004';
insert into public.clip_topics (clip_id, topic_id) values
  ('eeeeeeee-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000002');
select is(
  (select status::text from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000004'),
  'needs_second_review',
  'a clip approved by a curator goes to a second review when it gets a sensitive topic'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000021", "role": "authenticated"}';
select lives_ok(
  $$ update public.clips set sensitive = false where id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  'a reviewer can take the sensitive mark off a clip'
);
select is(
  (select sensitive from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000003'),
  false,
  'the reviewer''s change stands'
);
update public.clips set sensitive = false where id = 'eeeeeeee-0000-4000-8000-000000000002';
select is(
  (select sensitive from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000002'),
  true,
  'a clip on a sensitive topic stays sensitive, whoever clears the mark'
);

-- Removing staff --------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000031", "role": "authenticated"}';
select lives_ok(
  $$ delete from public.staff where user_id = '00000000-0000-4000-8000-000000000012' $$,
  'an admin can still remove a staff member who approved clips'
);
select is(
  (select reviewed_by from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000004'),
  null::uuid,
  'the removed staff member''s name comes off the clips they approved'
);
select is(
  (select saint_id from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'every clip still has the saint of its video'
);

select * from finish();
rollback;
