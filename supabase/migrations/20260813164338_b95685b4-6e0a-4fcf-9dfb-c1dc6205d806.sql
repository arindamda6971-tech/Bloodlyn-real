-- Only the patient who owns the order may join topic 'webrtc-{order_id}'.
create or replace function public.can_access_webrtc_topic(_topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _topic like 'webrtc-%'
    and auth.uid() is not null
    and exists (
      select 1
      from public.orders o
      where o.id::text = substring(_topic from 8)
        and o.user_id = auth.uid()
    )
$$;

drop policy if exists "webrtc_topic_select" on realtime.messages;
drop policy if exists "webrtc_topic_insert" on realtime.messages;

create policy "webrtc_topic_select"
on realtime.messages
for select
to authenticated
using (public.can_access_webrtc_topic(realtime.topic()));

create policy "webrtc_topic_insert"
on realtime.messages
for insert
to authenticated
with check (public.can_access_webrtc_topic(realtime.topic()));
