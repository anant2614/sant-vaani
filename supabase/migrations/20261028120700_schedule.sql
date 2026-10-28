-- Nightly jobs. pg_cron calls the server functions through pg_net, with
-- the project URL and a shared secret kept in Vault:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random secret>', 'cron_secret');
-- The same secret is set as CRON_SECRET for the functions. Until both
-- secrets exist (as in local development) the jobs do nothing.
-- Times are UTC; India is 5:30 ahead.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create function public.call_job(job text) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base_url is null or secret is null then
    raise notice 'skipping %: add project_url and cron_secret to Vault', job;
    return null;
  end if;
  return net.http_post(
    url := base_url || '/functions/v1/' || job,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
end
$$;

revoke execute on function public.call_job(text) from public, anon, authenticated;

-- 01:00 India: new uploads from every allowlisted channel.
select cron.schedule('fetch-uploads', '30 19 * * *', $$select public.call_job('fetch-uploads')$$);
-- Every hour: send new videos for suggestions, collect finished batches.
select cron.schedule('suggest-clips', '15 * * * *', $$select public.call_job('suggest-clips')$$);
-- 02:00 India: re-check live clips and refresh stored YouTube data.
select cron.schedule('check-clips', '30 20 * * *', $$select public.call_job('check-clips')$$);
-- 03:00 India: publish the catalogue file and send "your question was answered".
select cron.schedule('build-catalogue', '30 21 * * *', $$select public.call_job('build-catalogue')$$);
