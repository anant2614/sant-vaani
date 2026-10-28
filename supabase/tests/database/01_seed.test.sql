begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is((select count(*)::int from public.verses where scripture_id = 'gita'), 700, 'the Gita has 700 verses');
select is((select count(*)::int from public.chapters where scripture_id = 'gita'), 18, 'the Gita has 18 chapters');
select is((select count(*)::int from public.topics), 40, 'there are 40 topics');
select is(
  (select count(*)::int from public.topics t
    where (select count(*) from public.questions q where q.topic_id = t.id) not between 2 and 4),
  0,
  'every topic has 2 to 4 curated questions'
);
select is(
  (select count(*)::int from public.questions where text_en is null or text_hi is null or cardinality(phrasings) = 0),
  0,
  'every curated question has English, Hindi and other phrasings'
);
select is(
  (select array_agg(slug order by slug) from public.topics where sensitive),
  array['death', 'family-conflict', 'grief', 'heavy-heart', 'parents', 'sadness'],
  'grief, self-harm and family topics are sensitive'
);
select is((select count(*)::int from public.paths), 3, 'there are 3 paths');
select is(
  (select count(*)::int from public.path_days where verse_chapter is not null and step_id is not null),
  21,
  'every path day has a verse and a step'
);
select is((select count(*)::int from public.daily_verses), 31, 'Today rotates through 31 verses');
select is(
  (select sanskrit from public.verses where scripture_id = 'gita' and chapter = 2 and verse = 47),
  E'कर्मण्येवाधिकारस्ते मा फलेषु कदा चन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
  'verse 2.47 is stored in Devanagari'
);

select * from finish();
rollback;
