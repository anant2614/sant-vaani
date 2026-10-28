begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'curator@example.com'),
  ('00000000-0000-4000-8000-000000000031', 'admin@example.com'),
  ('00000000-0000-4000-8000-000000000041', 'New.Reviewer@example.com');
insert into public.staff (user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000011', 'curator', 'Curator'),
  ('00000000-0000-4000-8000-000000000031', 'admin', 'Admin');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_like(
  $$ select public.add_staff('new.reviewer@example.com', 'reviewer', 'Reviewer') $$,
  '%only an admin%',
  'a curator cannot add staff'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000031", "role": "authenticated"}';
select is(
  public.add_staff(' new.reviewer@example.com ', 'reviewer', 'Reviewer'),
  '00000000-0000-4000-8000-000000000041'::uuid,
  'an admin adds staff by email, ignoring case and spaces'
);
select is(
  (select role::text from public.staff where user_id = '00000000-0000-4000-8000-000000000041'),
  'reviewer',
  'the new staff member has the chosen role'
);
select throws_like(
  $$ select public.add_staff('nobody@example.com', 'curator', 'Nobody') $$,
  '%sign in to the studio once%',
  'an unknown email asks the person to sign in first'
);

select * from finish();
rollback;
