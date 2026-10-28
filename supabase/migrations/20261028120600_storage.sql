-- Storage buckets.
--   catalogue:   the nightly catalogue file. Public to read; only the
--                build-catalogue function (service role) writes.
--   permissions: signed permission letters and licences. Staff only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalogue', 'catalogue', true, 20971520, array['application/json']),
  ('permissions', 'permissions', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "staff read permission documents" on storage.objects
  for select to authenticated using (bucket_id = 'permissions' and public.is_staff());
create policy "staff add permission documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'permissions' and public.is_staff());
create policy "staff remove permission documents" on storage.objects
  for delete to authenticated using (bucket_id = 'permissions' and public.is_staff());
