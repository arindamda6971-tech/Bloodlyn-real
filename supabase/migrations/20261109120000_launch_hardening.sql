-- Launch hardening (from the Supabase Security and Performance Advisors, 9 Nov 2026).
-- Changes access rules and indexes only: no table, row or column is removed.
-- Doctor / video-call tables are left alone on purpose (that feature is paused).

begin;

-- 1. lab_offers had a single "Allow all access" rule (ALL, USING true, WITH CHECK
--    true), so anyone with the public app key could create, edit or delete offers.
--    Nothing in this project writes the table with that key: partner offers reach
--    the app through diagnostic_centers.offers, written by the partner sync with the
--    service role (which bypasses RLS). Keep it readable, stop public writes.
drop policy if exists "Allow all access to lab offers" on public.lab_offers;
drop policy if exists "Anyone can view active offers" on public.lab_offers;
create policy "Anyone can view active offers" on public.lab_offers
  for select using (is_active = true and end_date >= current_date);

-- 2. Identical duplicate indexes: each pair indexes the same column the same way,
--    so every write was paying for two. Keep the ones the repo's migrations create.
drop index if exists public.profiles_id_idx;                       -- same as profiles_pkey
drop index if exists public.test_packages_diagnostic_center_id_idx; -- same as idx_test_packages_diagnostic_center
drop index if exists public.order_items_order_id_idx;              -- same as idx_order_items_order_id
drop index if exists public.reports_order_id_idx;                  -- same as idx_reports_order_id

-- 3. RLS rules that call auth.uid() / auth.jwt() / auth.role() directly re-run the
--    call for every row. Wrapping it as (select auth.uid()) lets Postgres run it once
--    per query. Same meaning, much less work on big tables. Calls already wrapped are
--    left as they are; doctor/consultation tables are skipped.
do $$
declare
  p record;
  new_using text;
  new_check text;
  stmt text;
  pattern constant text := '(?<!select )auth\.(uid|jwt|role)\(\)';
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename not in ('appointments', 'doctor_messages', 'prescriptions')
      and tablename not like 'doctor%'
      and (coalesce(qual, '') ~* pattern or coalesce(with_check, '') ~* pattern)
  loop
    new_using := case when p.qual is null then null
                      else regexp_replace(p.qual, pattern, '(select auth.\1())', 'gi') end;
    new_check := case when p.with_check is null then null
                      else regexp_replace(p.with_check, pattern, '(select auth.\1())', 'gi') end;

    stmt := format('alter policy %I on public.%I', p.policyname, p.tablename);
    if new_using is not null then
      stmt := stmt || format(' using (%s)', new_using);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end $$;

commit;
