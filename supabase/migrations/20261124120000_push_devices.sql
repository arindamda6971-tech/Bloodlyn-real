-- Phones that get BloodLyn call alerts (the doctor or the collection partner ringing).
-- Firebase Cloud Messaging is only the route Android gives apps to reach a closed app:
-- this list, like every other record, lives here in Supabase.
--
-- The app never reads or writes the table itself: it registers its own phone through
-- register_push_device and forgets it on signing out through unregister_push_device.
-- The edge functions (service role) read it to send alerts and drop phones Firebase
-- says are gone.

create table if not exists public.push_devices (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_devices_user_id_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;

-- A phone signs in: its alerts now go to this person. A shared phone belongs to whoever
-- signed in last, so nobody's alerts ring on a phone they've signed out of.
create or replace function public.register_push_device(_token text, _platform text default 'android', _app_version text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if _token is null or length(_token) < 20 or length(_token) > 4096 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;
  insert into public.push_devices (token, user_id, platform, app_version, last_seen_at)
  values (
    _token,
    auth.uid(),
    case when _platform in ('android', 'ios', 'web') then _platform else 'android' end,
    left(_app_version, 40),
    now()
  )
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        app_version = excluded.app_version,
        last_seen_at = now();
end;
$$;

-- Signing out: this phone stops getting this person's alerts.
create or replace function public.unregister_push_device(_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_devices where token = _token and user_id = auth.uid();
$$;

revoke all on function public.register_push_device(text, text, text) from public, anon;
grant execute on function public.register_push_device(text, text, text) to authenticated;
revoke all on function public.unregister_push_device(text) from public, anon;
grant execute on function public.unregister_push_device(text) to authenticated;
