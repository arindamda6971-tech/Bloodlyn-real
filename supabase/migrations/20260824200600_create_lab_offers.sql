create table if not exists public.lab_offers (
    id uuid default gen_random_uuid() primary key,
    lab_id uuid references auth.users(id) not null,
    type text not null check (type in ('free_delivery', 'percentage_discount', 'flat_discount')),
    min_order_amount numeric not null default 0,
    discount_value numeric not null default 0,
    max_discount_cap numeric,
    start_date date not null,
    end_date date not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.lab_offers enable row level security;

-- Policies
create policy "Anyone can view active offers" on public.lab_offers
    for select using (is_active = true and end_date >= current_date);

create policy "Labs can view their own offers" on public.lab_offers
    for select using (auth.uid() = lab_id);

create policy "Labs can insert their own offers" on public.lab_offers
    for insert with check (auth.uid() = lab_id);

create policy "Labs can update their own offers" on public.lab_offers
    for update using (auth.uid() = lab_id) with check (auth.uid() = lab_id);

create policy "Labs can delete their own offers" on public.lab_offers
    for delete using (auth.uid() = lab_id);
