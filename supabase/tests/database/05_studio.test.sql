-- Studio helpers: save_clip, save_answer and the clip_cards view.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'curator@example.com'),
  ('00000000-0000-4000-8000-000000000021', 'reviewer@example.com');
insert into public.staff (user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000011', 'curator', 'Curator'),
  ('00000000-0000-4000-8000-000000000021', 'reviewer', 'Reviewer');

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
insert into public.topics (id, slug, group_slug, name_en, name_hi, sensitive) values
  ('ffffffff-0000-4000-8000-000000000001', 'test-calm', 'mind', 'Calm', 'शांति', false),
  ('ffffffff-0000-4000-8000-000000000002', 'test-grief', 'hardship', 'Grief', 'शोक', true);

-- Ids returned by the functions under test, for later checks.
create temporary table saved (name text primary key, id uuid) on commit drop;
grant all on saved to authenticated;

-- save_clip -----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';

insert into saved values ('calm', public.save_clip(
  null, 'dddddddd-0000-4000-8000-000000000001', 60, 240, 'hi', 'On a restless mind', null, false,
  array['ffffffff-0000-4000-8000-000000000001']::uuid[], true
));
select is(
  (select status::text || ' ' || (select count(*) from public.clip_topics where clip_id = c.id)
   from public.clips c where c.id = (select id from saved where name = 'calm')),
  'approved 1',
  'save_clip approves a clip and stores its topics'
);

insert into saved values ('grief', public.save_clip(
  null, 'dddddddd-0000-4000-8000-000000000002', 60, 240, 'hi', 'On losing a parent', null, false,
  array['ffffffff-0000-4000-8000-000000000002']::uuid[], true
));
select is(
  (select status::text || ' ' || sensitive::text from public.clips where id = (select id from saved where name = 'grief')),
  'needs_second_review true',
  'a clip on a sensitive topic waits for a second reviewer'
);

insert into saved values ('draft', public.save_clip(
  null, 'dddddddd-0000-4000-8000-000000000003', 60, 240, 'en', null, 'मन की बात', false,
  array['ffffffff-0000-4000-8000-000000000001']::uuid[], false
));
select is(
  (select status::text from public.clips where id = (select id from saved where name = 'draft')),
  'draft',
  'save_clip keeps a draft when not submitted'
);

select throws_like(
  $$ select public.save_clip(null, 'dddddddd-0000-4000-8000-000000000001', 300, 400, 'hi', 'No topic', null, false, '{}', true) $$,
  '%at least one topic%',
  'a clip needs a topic'
);

select lives_ok(
  $$ select public.save_clip((select id from saved where name = 'calm'), 'dddddddd-0000-4000-8000-000000000001',
       70, 240, 'hi', 'On a restless mind', null, false,
       array['ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002']::uuid[], true) $$,
  'the curator edits the clip and adds a sensitive topic'
);
select is(
  (select status::text || ' ' || start_seconds || ' ' || (select count(*) from public.clip_topics where clip_id = c.id)
   from public.clips c where c.id = (select id from saved where name = 'calm')),
  'needs_second_review 70 2',
  'adding a sensitive topic while editing sends the clip to a second review'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000021", "role": "authenticated"}';
select lives_ok(
  $$ select public.save_clip((select id from saved where name = 'grief'), 'dddddddd-0000-4000-8000-000000000002',
       60, 240, 'hi', 'On losing a parent', null, false,
       array['ffffffff-0000-4000-8000-000000000002']::uuid[], true) $$,
  'the reviewer saves the curator''s sensitive clip'
);
select is(
  (select status::text || ' ' || (reviewed_by = '00000000-0000-4000-8000-000000000021')::text
   from public.clips where id = (select id from saved where name = 'grief')),
  'approved true',
  'a reviewer who did not make a sensitive clip approves it'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
update public.clips set end_seconds = 200 where id = (select id from saved where name = 'grief');
select is(
  (select status::text from public.clips where id = (select id from saved where name = 'grief')),
  'needs_second_review',
  'editing an approved sensitive clip by its maker sends it back for a second review'
);
select throws_like(
  $$ select public.save_clip((select id from saved where name = 'grief'), 'dddddddd-0000-4000-8000-000000000002',
       60, 200, 'hi', 'On losing a parent', null, false,
       array['ffffffff-0000-4000-8000-000000000001']::uuid[], true) $$,
  '%only a reviewer or admin can mark a clip as not sensitive%',
  'a curator cannot save a sensitive clip as not sensitive'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000021", "role": "authenticated"}';
select lives_ok(
  $$ select public.save_clip((select id from saved where name = 'grief'), 'dddddddd-0000-4000-8000-000000000002',
       60, 200, 'hi', 'On losing a parent', null, false,
       array['ffffffff-0000-4000-8000-000000000001']::uuid[], true) $$,
  'a reviewer moves the clip to a topic that is not sensitive'
);
select is(
  (select status::text || ' ' || sensitive::text from public.clips where id = (select id from saved where name = 'grief')),
  'approved false',
  'one save by a reviewer changes the topic and takes the sensitive mark off'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';

-- clip_cards ------------------------------------------------------------------
select is(
  (select live::text || ' ' || saint_name || ' ' || array_length(topic_ids, 1) || ' ' || created_by_name
   from public.clip_cards where id = (select id from saved where name = 'draft')),
  'false Sample Saint 3 1 Curator',
  'clip_cards shows a draft as not live, with its saint, topics and maker'
);

-- save_answer -----------------------------------------------------------------
reset role;
insert into public.clips (id, video_id, start_seconds, end_seconds, language, summary_en, status)
select ('eeeeeeee-0000-4000-8000-00000000000' || n)::uuid, ('dddddddd-0000-4000-8000-00000000000' || n)::uuid,
  500, 600, 'hi', 'Sample clip ' || n, 'approved'
from generate_series(1, 4) n;
insert into public.questions (id, topic_id, text_en) values
  ('99999999-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Test question one?'),
  ('99999999-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Test question two?');
insert into public.steps (id, text_en) values ('88888888-0000-4000-8000-000000000001', 'Take ten slow breaths.');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
insert into saved values ('answer', public.save_answer(
  '99999999-0000-4000-8000-000000000001',
  array['eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000003']::uuid[],
  6::smallint, 35::smallint, '88888888-0000-4000-8000-000000000001'
));
select is(
  (select string_agg(right(clip_id::text, 1), ',' order by position) from public.answer_clips
   where answer_id = (select id from saved where name = 'answer')),
  '1,2,3',
  'save_answer stores the clips in order'
);
select lives_ok($$ select public.publish_answer((select id from saved where name = 'answer')) $$, 'the answer publishes');

select lives_ok(
  $$ select public.save_answer('99999999-0000-4000-8000-000000000001',
       array['eeeeeeee-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000004']::uuid[],
       6::smallint, 35::smallint, '88888888-0000-4000-8000-000000000001') $$,
  'a published answer can swap and reorder its clips'
);
select is(
  (select a.status::text || ' ' || string_agg(right(ac.clip_id::text, 1), ',' order by ac.position)
   from public.answers a join public.answer_clips ac on ac.answer_id = a.id
   where a.id = (select id from saved where name = 'answer') group by a.status),
  'published 3,1,4',
  'saving a published answer keeps it published'
);

select throws_like(
  $$ select public.save_answer('99999999-0000-4000-8000-000000000001',
       array['eeeeeeee-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000001']::uuid[],
       6::smallint, 35::smallint, '88888888-0000-4000-8000-000000000001') $$,
  '%3 to 5 clips%',
  'a published answer cannot drop below 3 clips'
);
select is(
  (select count(*)::int from public.answer_clips where answer_id = (select id from saved where name = 'answer')),
  3,
  'the failed save leaves the answer as it was'
);

select lives_ok(
  $$ select public.save_answer('99999999-0000-4000-8000-000000000002',
       array['eeeeeeee-0000-4000-8000-000000000002']::uuid[], null, null, null) $$,
  'a draft answer can be saved unfinished'
);

select * from finish();
rollback;
