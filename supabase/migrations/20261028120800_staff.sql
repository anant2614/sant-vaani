-- Admins add curators and reviewers by the email they signed in to the
-- studio with. The person signs in once first, so their account exists.

create function public.add_staff(email text, role public.staff_role, display_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid;
begin
  if not (public.is_admin() or coalesce(auth.role(), 'service_role') = 'service_role') then
    raise exception 'only an admin can add staff' using errcode = 'insufficient_privilege';
  end if;
  select u.id into uid from auth.users u where lower(u.email) = lower(trim(add_staff.email)) limit 1;
  if uid is null then
    raise exception 'no account uses that email yet; ask them to sign in to the studio once'
      using errcode = 'no_data_found';
  end if;
  insert into public.staff (user_id, role, display_name)
  values (uid, add_staff.role, add_staff.display_name)
  on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name;
  return uid;
end
$$;

revoke execute on function public.add_staff(text, public.staff_role, text) from public, anon;
grant execute on function public.add_staff(text, public.staff_role, text) to authenticated, service_role;
