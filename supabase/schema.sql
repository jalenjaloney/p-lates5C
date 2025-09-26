-- ---------- TABLES ----------

-- Dining halls across the 5Cs.
-- Each hall gets an auto-id and a unique name.
create table if not exists public.halls (
  id         integer generated always as identity primary key,
  name       text not null unique,   -- e.g. "Frank" or "Collins"
  campus     text,                   -- optional (Pomona, CMC, etc.)
  created_at timestamp not null default now()
);

-- What a hall is serving on a specific date + meal.
-- Example row: "Frank, 2025-09-25, lunch, Teriyaki Tofu"
create table if not exists public.menu_items (
  id         integer generated always as identity primary key,
  hall_id    integer not null references public.halls(id) on delete cascade,
  date_served date not null,
  meal       text not null check (meal in ('breakfast','lunch','dinner','late_night')),
  dish_name  text not null,
  tags       text[],                  -- optional: ["vegan","gluten_free"]
  created_at timestamp not null default now(),

  -- Don’t allow duplicate entries like “Frank / lunch / 9-25 / Teriyaki Tofu”
  unique (hall_id, date_served, meal, dish_name)
);

-- Ratings left by students for a specific menu item.
-- For now, ties directly to Supabase auth.users via user_id.
create table if not exists public.dish_ratings (
  id           integer generated always as identity primary key,
  menu_item_id integer not null references public.menu_items(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade
                 default auth.uid(),
  rater_handle text,     -- optional display name, can be null
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamp not null default now(),

  -- Each user can only rate a dish once (per menu occurrence).
  unique (menu_item_id, user_id)
);

--Profiles created by reviewees
create table if not exists public.profiles (
  user_id     uuid not null references auth.users(id) on delete cascade 
                default auth.uid(),
  user_handle text unique not null, -- this is similar to a unique username
  display_name text, --what shows up
  campus text, --pomona,pitzer,cmk,scripps,hmc
  created_at timestamp not null default now()
);

-- ---------- INDEXES ----------
-- These speed up common lookups: e.g. menus by date, reviews by dish.
create index if not exists idx_menu_items_hall_date_meal
  on public.menu_items (hall_id, date_served, meal);

create index if not exists idx_menu_items_date
  on public.menu_items (date_served);

create index if not exists idx_dish_ratings_menu_item
  on public.dish_ratings (menu_item_id);

-- ---------- POLICIES ----------
-- We use Row Level Security (RLS) to control who can see and modify what.
-- Supabase defaults to “everyone can read/write everything”.
-- We flip that so:
--   - Menus/halls: everyone can read, only service_role can edit
--   - Ratings: anyone can read, users can only change their own ratings

-- Turn RLS on
alter table public.halls        enable row level security;
alter table public.menu_items   enable row level security;
alter table public.dish_ratings enable row level security;
alter table public.profiles enable row level security;

-- Clean up old policies if re-running
drop policy if exists halls_select_public      on public.halls;
drop policy if exists halls_write_service      on public.halls;

drop policy if exists menu_items_select_public on public.menu_items;
drop policy if exists menu_items_write_service on public.menu_items;

drop policy if exists ratings_select_public    on public.dish_ratings;
drop policy if exists ratings_insert_own       on public.dish_ratings;
drop policy if exists ratings_update_own       on public.dish_ratings;
drop policy if exists ratings_delete_own       on public.dish_ratings;

-- ----- HALLS -----
-- Anyone (anon or logged-in) can view halls
create policy halls_select_public
  on public.halls
  for select using (true);

-- Only the backend (service_role key) can create/update/delete halls
create policy halls_write_service
  on public.halls
  for all to service_role
  using (true) with check (true);

-- ----- MENU ITEMS -----
-- Anyone can view menus
create policy menu_items_select_public
  on public.menu_items
  for select using (true);

-- Only backend can create/update/delete menus
create policy menu_items_write_service
  on public.menu_items
  for all to service_role
  using (true) with check (true);

-- ----- RATINGS -----
-- Anyone can read ratings
create policy ratings_select_public
  on public.dish_ratings
  for select using (true);

-- Logged-in users can insert their own rating
create policy ratings_insert_own
  on public.dish_ratings
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Logged-in users can only update their own rating
create policy ratings_update_own
  on public.dish_ratings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logged-in users can only delete their own rating
create policy ratings_delete_own
  on public.dish_ratings
  for delete to authenticated
  using (auth.uid() = user_id);
