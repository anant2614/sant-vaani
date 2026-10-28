-- Curation rules: answers, second review, retiring and takedowns, Ask helpers.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'person@example.com'),
  ('00000000-0000-4000-8000-000000000011', 'curator@example.com'),
  ('00000000-0000-4000-8000-000000000012', 'curator2@example.com'),
  ('00000000-0000-4000-8000-000000000021', 'reviewer@example.com'),
  ('00000000-0000-4000-8000-000000000031', 'admin@example.com');
insert into public.staff (user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000011', 'curator', 'Curator'),
  ('00000000-0000-4000-8000-000000000012', 'curator', 'Second curator'),
  ('00000000-0000-4000-8000-000000000021', 'reviewer', 'Reviewer'),
  ('00000000-0000-4000-8000-000000000031', 'admin', 'Admin');

-- Four saints, one channel and one video each.
insert into public.saints (id, slug, name_en, initials)
select ('aaaaaaaa-0000-4000-8000-00000000000' || n)::uuid, 'sample-saint-' || n, 'Sample Saint ' || n, 'S' || n
from generate_series(1, 4) n;
insert into public.channels (id, saint_id, youtube_channel_id)
select ('cccccccc-0000-4000-8000-00000000000' || n)::uuid, ('aaaaaaaa-0000-4000-8000-00000000000' || n)::uuid,
  'UC' || repeat(n::text, 22)
from generate_series(1, 4) n;
insert into public.videos (id, channel_id, youtube_id)
select ('dddddddd-0000-4000-8000-00000000000' || n)::uuid, ('cccccccc-0000-4000-8000-00000000000' || n)::uuid,
  repeat(n::text, 11)
from generate_series(1, 4) n;

-- Clips e1..e4 by saints 1..4, and e5, a second clip by saint 1.
insert into public.clips (id, video_id, start_seconds, end_seconds, language, summary_en, status)
select ('eeeeeeee-0000-4000-8000-00000000000' || n)::uuid, ('dddddddd-0000-4000-8000-00000000000' || n)::uuid,
  60, 240, 'hi', 'Sample clip ' || n, 'approved'
from generate_series(1, 4) n;
insert into public.clips (id, video_id, start_seconds, end_seconds, language, summary_en, status) values
  ('eeeeeeee-0000-4000-8000-000000000005', 'dddddddd-0000-4000-8000-000000000001', 300, 420, 'hi', 'Sample clip 5', 'approved');

select is(
  (select saint_id from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000003'),
  'aaaaaaaa-0000-4000-8000-000000000003'::uuid,
  'a clip takes its saint from the video''s channel'
);
select throws_ok(
  $$ insert into public.clips (video_id, start_seconds, end_seconds, language, summary_en)
     values ('dddddddd-0000-4000-8000-000000000001', 0, 10, 'hi', 'too short') $$,
  '23514',
  null,
  'a clip is at least 15 seconds long'
);

insert into public.topics (id, slug, group_slug, name_en, name_hi, sensitive) values
  ('ffffffff-0000-4000-8000-000000000001', 'test-calm', 'mind', 'Calm', 'शांति', false),
  ('ffffffff-0000-4000-8000-000000000002', 'test-grief', 'hardship', 'Grief', 'शोक', true);
insert into public.questions (id, topic_id, text_en) values
  ('99999999-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Test question one?'),
  ('99999999-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Test question two?');
insert into public.steps (id, text_en) values ('88888888-0000-4000-8000-000000000001', 'Take ten slow breaths.');
insert into public.answers (id, question_id, verse_chapter, verse_number, step_id) values
  ('77777777-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001', 6, 35, '88888888-0000-4000-8000-000000000001'),
  ('77777777-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000002', null, null, null);

-- Answers -------------------------------------------------------------------
insert into public.answer_clips (answer_id, clip_id, position) values
  ('77777777-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001', 1),
  ('77777777-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002', 2);

select throws_like(
  $$ select public.publish_answer('77777777-0000-4000-8000-000000000001') $$,
  '%3 to 5 clips%',
  'publish_answer rejects 2 clips'
);
select throws_like(
  $$ insert into public.answer_clips (answer_id, clip_id, position)
     values ('77777777-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000005', 3) $$,
  '%already has a clip by that saint%',
  'an answer cannot repeat a saint'
);

insert into public.answer_clips (answer_id, clip_id, position) values
  ('77777777-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000003', 3);
select lives_ok($$ select public.publish_answer('77777777-0000-4000-8000-000000000001') $$, 'publish_answer accepts 3 clips');
select is(
  (select status::text from public.answers where id = '77777777-0000-4000-8000-000000000001'),
  'published',
  'the answer is published'
);

insert into public.answer_clips (answer_id, clip_id, position) values
  ('77777777-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000005', 1),
  ('77777777-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000002', 2),
  ('77777777-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004', 3);
select throws_like(
  $$ select public.publish_answer('77777777-0000-4000-8000-000000000002') $$,
  '%needs a Gita verse%',
  'publish_answer needs a verse'
);
select throws_like(
  $$ update public.answers set status = 'published' where id = '77777777-0000-4000-8000-000000000002' $$,
  '%publish_answer%',
  'an answer cannot be published by a plain update'
);

-- Retiring --------------------------------------------------------------------
select lives_ok(
  $$ select public.retire_clip('eeeeeeee-0000-4000-8000-000000000003', 'video went private') $$,
  'retire_clip runs'
);
select is(
  (select status::text from public.answers where id = '77777777-0000-4000-8000-000000000001'),
  'needs_replacement',
  'retiring a clip flags its answers for replacement'
);
update public.answers set verse_chapter = 2, verse_number = 14, step_id = '88888888-0000-4000-8000-000000000001'
  where id = '77777777-0000-4000-8000-000000000002';
update public.answer_clips set clip_id = 'eeeeeeee-0000-4000-8000-000000000003'
  where answer_id = '77777777-0000-4000-8000-000000000002' and clip_id = 'eeeeeeee-0000-4000-8000-000000000004';
select throws_like(
  $$ select public.publish_answer('77777777-0000-4000-8000-000000000002') $$,
  '%approved and live%',
  'publish_answer rejects a retired clip'
);

-- Takedowns -------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_like(
  $$ select public.set_saint_takedown('aaaaaaaa-0000-4000-8000-000000000002', true) $$,
  '%only an admin%',
  'a curator cannot take a saint down'
);
select throws_like(
  $$ update public.saints set taken_down = true where id = 'aaaaaaaa-0000-4000-8000-000000000002' $$,
  '%only an admin%',
  'a curator cannot take a saint down with a plain update'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000031", "role": "authenticated"}';
select is(
  (select count(*)::int from public.live_clips where saint_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1,
  'saint 2 has a live clip'
);
select lives_ok($$ select public.set_saint_takedown('aaaaaaaa-0000-4000-8000-000000000002', true) $$, 'an admin takes saint 2 down');
select is(
  (select count(*)::int from public.live_clips where saint_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0,
  'takedown hides the saint''s clips from live_clips'
);

-- Second review for sensitive clips -------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_like(
  $$ insert into public.clips (video_id, start_seconds, end_seconds, language, summary_en, sensitive, status)
     values ('dddddddd-0000-4000-8000-000000000004', 500, 600, 'hi', 'On losing a parent', true, 'approved') $$,
  '%second reviewer%',
  'a curator cannot approve their own sensitive clip'
);
insert into public.clips (id, video_id, start_seconds, end_seconds, language, summary_en, sensitive, status) values
  ('eeeeeeee-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000004', 500, 600, 'hi', 'On losing a parent', true, 'needs_second_review');

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000012", "role": "authenticated"}';
select throws_like(
  $$ update public.clips set status = 'approved' where id = 'eeeeeeee-0000-4000-8000-000000000006' $$,
  '%only a reviewer or admin%',
  'another curator cannot give the second review'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000021", "role": "authenticated"}';
select lives_ok(
  $$ update public.clips set status = 'approved' where id = 'eeeeeeee-0000-4000-8000-000000000006' $$,
  'a reviewer approves a sensitive clip they did not make'
);
select is(
  (select reviewed_by from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000006'),
  '00000000-0000-4000-8000-000000000021'::uuid,
  'the reviewer is recorded'
);

reset role;
set local request.jwt.claims to '{}';
insert into public.clip_topics (clip_id, topic_id) values
  ('eeeeeeee-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000002');
select is(
  (select status::text || ' ' || sensitive::text from public.clips where id = 'eeeeeeee-0000-4000-8000-000000000004'),
  'needs_second_review true',
  'adding a sensitive topic sends an approved clip back for a second review'
);

-- Ask helpers -----------------------------------------------------------------
select is(
  array[
    public.bump_ask_usage('00000000-0000-4000-8000-000000000001', 2),
    public.bump_ask_usage('00000000-0000-4000-8000-000000000001', 2),
    public.bump_ask_usage('00000000-0000-4000-8000-000000000001', 2)
  ],
  array[true, true, false],
  'bump_ask_usage allows up to the daily limit'
);
select is(
  array[public.claim_model_call(2), public.claim_model_call(2), public.claim_model_call(2)],
  array[true, true, false],
  'claim_model_call allows up to the day''s budget for everyone'
);
select is(
  public.record_backlog('how do i stop overthinking at work', 'How do I stop overthinking at work?', array['overthinking']),
  public.record_backlog('how do i stop overthinking at work', 'how do i stop overthinking at work', array['overthinking']),
  'the same question lands on the same backlog item'
);
select throws_ok(
  $$ insert into public.asks (user_id, question, result, matcher)
     values ('00000000-0000-4000-8000-000000000001', 'some words', 'crisis', 'none') $$,
  '23514',
  null,
  'a crisis ask cannot keep the question text'
);

select * from finish();
rollback;
