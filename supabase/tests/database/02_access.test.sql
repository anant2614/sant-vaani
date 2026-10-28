-- Row-level security: people see only their own rows, content is staff only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'person@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'other@example.com'),
  ('00000000-0000-4000-8000-000000000011', 'curator@example.com');
insert into public.staff (user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000011', 'curator', 'Curator');

insert into public.saints (id, slug, name_en, initials) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'sample-saint-a', 'Sample Saint A', 'SA');
insert into public.channels (id, saint_id, youtube_channel_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'UCaaaaaaaaaaaaaaaaaaaaaa');
insert into public.videos (id, channel_id, youtube_id) values
  ('dddddddd-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'aaaaaaaaaaa');
insert into public.clips (video_id, start_seconds, end_seconds, language, summary_en, status) values
  ('dddddddd-0000-4000-8000-000000000001', 30, 190, 'hi', 'Why the mind races at night', 'approved');

insert into public.notes (user_id, chapter, verse, body) values
  ('00000000-0000-4000-8000-000000000001', 2, 47, 'mine'),
  ('00000000-0000-4000-8000-000000000002', 6, 35, 'theirs');
insert into public.asks (user_id, question, language, result, matcher) values
  ('00000000-0000-4000-8000-000000000001', 'how do i stop overthinking', 'en', 'nearest', 'model'),
  ('00000000-0000-4000-8000-000000000002', 'gussa kaise control karein', 'hinglish', 'nearest', 'model');

select is(
  (select count(*)::int from public.profiles where user_id = '00000000-0000-4000-8000-000000000001'),
  1,
  'a profile is made for every new user'
);

-- Signed out --------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select throws_ok('select * from public.clips', '42501', null, 'anon cannot read clips');
select throws_ok('select * from public.notes', '42501', null, 'anon cannot read notes');
select is((select count(*)::int from public.verses), 700, 'anon can read the Gita');

-- A person ------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select results_eq('select body from public.notes', array['mine'], 'a person reads only their own notes');
select results_eq(
  $$ with changed as (update public.notes set body = 'changed' where body = 'theirs' returning 1) select count(*)::int from changed $$,
  array[0],
  'a person cannot change someone else''s note'
);
select throws_ok(
  $$ insert into public.notes (user_id, chapter, verse, body) values ('00000000-0000-4000-8000-000000000002', 1, 1, 'x') $$,
  '42501',
  null,
  'a person cannot write a note as someone else'
);
select lives_ok(
  $$ insert into public.notes (chapter, verse, body) values (18, 66, 'surrender') $$,
  'a person can add a note'
);
select is((select count(*)::int from public.clips), 0, 'a person cannot see clips');
select is((select count(*)::int from public.topics), 0, 'a person cannot see the content tables');
select results_eq('select question from public.asks', array['how do i stop overthinking'], 'a person sees only their own asks');
select throws_ok(
  $$ insert into public.asks (user_id, result, matcher) values ('00000000-0000-4000-8000-000000000001', 'limited', 'none') $$,
  '42501',
  null,
  'only the ask function records asks'
);
select throws_ok(
  $$ select public.bump_ask_usage('00000000-0000-4000-8000-000000000001', 30) $$,
  '42501',
  null,
  'a person cannot reset their own ask limit'
);
select throws_ok(
  $$ select public.publish_answer(gen_random_uuid()) $$,
  '42501',
  null,
  'a person cannot publish answers'
);
select lives_ok(
  $$ update public.profiles set language = 'hi', theme_pref = 'dark' where user_id = '00000000-0000-4000-8000-000000000001' $$,
  'a person can change their settings'
);

-- A curator -------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';

select is((select count(*)::int from public.clips), 1, 'a curator can read clips');
select is((select count(*)::int from public.notes), 0, 'a curator cannot read people''s notes');

-- Deleting an account ---------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.delete_my_account();

reset role;
set local request.jwt.claims to '{}';
select is(
  (select count(*)::int from public.notes where user_id = '00000000-0000-4000-8000-000000000001')
    + (select count(*)::int from public.asks where user_id = '00000000-0000-4000-8000-000000000001')
    + (select count(*)::int from public.profiles where user_id = '00000000-0000-4000-8000-000000000001'),
  0,
  'delete_my_account removes notes, asks and the profile'
);
select is(
  (select count(*)::int from public.notes where user_id = '00000000-0000-4000-8000-000000000002'),
  1,
  'other people''s notes stay'
);

select * from finish();
rollback;
