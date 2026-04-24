create index if not exists idx_orders_dedup_lookup
on public.orders (user_id, vendor_id, total, scheduled_date, scheduled_time_slot, created_at desc);

with duplicate_groups as (
  select
    id,
    user_id,
    vendor_id,
    total,
    scheduled_date,
    scheduled_time_slot,
    created_at,
    first_value(id) over (
      partition by user_id, vendor_id, total, scheduled_date, scheduled_time_slot
      order by created_at asc, id asc
    ) as keeper_id,
    first_value(created_at) over (
      partition by user_id, vendor_id, total, scheduled_date, scheduled_time_slot
      order by created_at asc, id asc
    ) as keeper_created_at,
    row_number() over (
      partition by user_id, vendor_id, total, scheduled_date, scheduled_time_slot
      order by created_at asc, id asc
    ) as rn
  from public.orders
), duplicate_orders as (
  select id
  from duplicate_groups
  where rn > 1
    and created_at <= keeper_created_at + interval '60 seconds'
), deleted_items as (
  delete from public.order_items oi
  where oi.order_id in (select id from duplicate_orders)
  returning oi.id
)
delete from public.orders o
where o.id in (select id from duplicate_orders);

with orphaned_items as (
  delete from public.order_items oi
  where oi.order_id is not null
    and not exists (
      select 1 from public.orders o where o.id = oi.order_id
    )
  returning oi.id
)
select count(*) from orphaned_items;