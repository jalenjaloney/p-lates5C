-- p-lates5C core schema (tables, RLS, policies, helpers)

-- Extensions
create extension if not exists pgcrypto;

-- Types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_period') then
    create type meal_period as enum ('breakfast','lunch','dinner','late_night');
  end if;
end$$;

-- Tables
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  class_year int,
  dietary_prefs jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists halls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz default now()
);

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid references halls(id) on delete cascade,
  name text not null,
  dietary_tags text[],
  date_served date not null,
  meal meal_period not null default 'dinner',
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid references dishes(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  content text default ''::text,
  photo_url text,
  created_at timestamptz default now()
);

-- Uniqueness
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uniq_dish_per_hall_date_meal'
  ) then
    alter table dishes
      add constraint uniq_dish_per_hall_date_meal
      unique (hall_id, name, date_served, meal);
  end if;
end$$;

-- RLS enable
alter table profiles enable row level security;
alter table reviews  enable row level security;
alter table halls    enable row level security;
alter table dishes   enable row level security;

-- Cleanup legacy policies
drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "select own profile" on profiles;
drop policy if exists "update own profile" on profiles;

drop policy if exists "Users can view reviews" on reviews;
drop policy if exists "select reviews" on reviews;
drop policy if exists "Users can insert reviews" on reviews;
drop policy if exists "insert own review" on reviews;
drop policy if exists "update own review" on reviews;
drop policy if exists "delete own review" on reviews;

drop policy if exists "select halls"  on halls;
drop policy if exists "select dishes" on dishes;

-- Policies
create policy profiles_select_own on profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on profiles
  for update using (auth.uid() = id);

create policy reviews_select_authenticated on reviews
  for select using (auth.role() = 'authenticated');

create policy reviews_insert_own on reviews
  for insert with check (auth.uid() = user_id);

create policy reviews_update_own on reviews
  for update using (auth.uid() = user_id);

create policy reviews_delete_own on reviews
  for delete using (auth.uid() = user_id);

create policy halls_select_public on halls
  for select using (true);

create policy dishes_select_public on dishes
  for select using (true);

-- Auto-profile on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id, created_at) values (new.id, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Indexes
create index if not exists idx_dishes_hall_id       on dishes(hall_id);
create index if not exists idx_dishes_date_served   on dishes(date_served);
create index if not exists idx_dishes_date_meal     on dishes(date_served, meal);
create index if not exists idx_reviews_dish_id      on reviews(dish_id);
create index if not exists idx_reviews_user_id      on reviews(user_id);

-- Views / RPCs
create or replace view dishes_today as
select d.* from dishes d where d.date_served = current_date;

create or replace function top_dishes_by_hall(h uuid, limit_n int default 5)
returns table(dish_id uuid, name text, avg_rating numeric, ratings_count int)
language sql stable as $$
  select
    d.id,
    d.name,
    avg(r.rating)::numeric as avg_rating,
    count(r.id)           as ratings_count
  from dishes d
  left join reviews r on r.dish_id = d.id
  where d.hall_id = h and d.date_served = current_date
  group by d.id, d.name
  order by avg_rating desc nulls last, ratings_count desc
  limit limit_n;
$$;
