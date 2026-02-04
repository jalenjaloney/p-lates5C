-- ---------- TABLES ----------

-- Dining halls across the 5Cs.
-- Each hall gets an auto-id and a unique name.
create table if not exists public.halls (
  id         integer generated always as identity primary key,
  name       text not null unique,   -- e.g. "Frank" or "Collins"
  campus     text,                   -- optional (Pomona, CMC, etc.)
  created_at timestamp not null default now()
);

-- Canonical dishes per hall (stable identity for reviews, etc.)
create table if not exists public.dishes (
  id               integer generated always as identity primary key,
  hall_id          integer not null references public.halls(id) on delete cascade,
  name             text not null,
  slug             text not null, -- URL-friendly identifier per hall
  description      text,
  ingredients      text,
  allergens        text[],
  dietary_choices  text[],
  nutrients        text,
  tags             text[],
  created_at       timestamp not null default now(),
  updated_at       timestamp not null default now(),
  unique (hall_id, slug),
  unique (hall_id, lower(name))
);

-- What a hall is serving on a specific date + meal (occurrence of a dish)
create table if not exists public.menu_items (
  id               integer generated always as identity primary key,
  hall_id          integer not null references public.halls(id) on delete cascade,
  dish_id          integer not null references public.dishes(id) on delete cascade,
  date_served      date not null,
  meal             text not null check (meal in ('breakfast','lunch','dinner','late_night')),
  dish_name        text not null, -- denormalized for convenience
  section          text not null default '', -- e.g. "Panini Station" / "Pizza" / "Mainline"
  description      text,          -- optional menu description (occurrence-specific)
  ingredients      text,
  allergens        text[],
  dietary_choices  text[],
  nutrients        text,
  tags             text[],
  created_at       timestamp not null default now(),

  -- Don’t allow duplicate entries for the same dish occurrence
  unique (hall_id, dish_id, date_served, meal, section)
);

-- Ratings left by students for a specific dish.
-- Tied directly to Supabase auth.users via user_id.
create table if not exists public.dish_ratings (
  id           integer generated always as identity primary key,
  dish_id      integer not null references public.dishes(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade
                 default auth.uid(),
  rater_handle text,     -- optional display name, can be null
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  image_url    text,
  created_at   timestamp not null default now(),

  -- Each user can only rate a dish once.
  unique (dish_id, user_id)
);

-- Likes on reviews (dish_ratings)
create table if not exists public.review_likes (
  id         integer generated always as identity primary key,
  rating_id  integer not null references public.dish_ratings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade
               default auth.uid(),
  created_at timestamp not null default now(),
  unique (rating_id, user_id)
);

-- ---------- INDEXES ----------
-- These speed up common lookups: e.g. menus by date, reviews by dish.
create index if not exists idx_dishes_hall_slug on public.dishes (hall_id, slug);
create index if not exists idx_menu_items_hall_date_meal
  on public.menu_items (hall_id, date_served, meal, section, dish_id);

create index if not exists idx_menu_items_date
  on public.menu_items (date_served);

create index if not exists idx_dish_ratings_dish
  on public.dish_ratings (dish_id);

create index if not exists idx_review_likes_rating
  on public.review_likes (rating_id);

-- ---------- POLICIES ----------
-- We use Row Level Security (RLS) to control who can see and modify what.
-- Supabase defaults to “everyone can read/write everything”.
-- We flip that so:
--   - Menus/halls: everyone can read, only service_role can edit
--   - Ratings: anyone can read, users can only change their own ratings

-- Turn RLS on
alter table public.halls        enable row level security;
alter table public.dishes       enable row level security;
alter table public.menu_items   enable row level security;
alter table public.dish_ratings enable row level security;
alter table public.review_likes enable row level security;

-- Clean up old policies if re-running
drop policy if exists halls_select_public      on public.halls;
drop policy if exists halls_write_service      on public.halls;
drop policy if exists dishes_select_public     on public.dishes;
drop policy if exists dishes_write_service     on public.dishes;

drop policy if exists menu_items_select_public on public.menu_items;
drop policy if exists menu_items_write_service on public.menu_items;

drop policy if exists ratings_select_public    on public.dish_ratings;
drop policy if exists ratings_insert_own       on public.dish_ratings;
drop policy if exists ratings_update_own       on public.dish_ratings;
drop policy if exists ratings_delete_own       on public.dish_ratings;

drop policy if exists review_likes_select_public on public.review_likes;
drop policy if exists review_likes_insert_own    on public.review_likes;
drop policy if exists review_likes_delete_own    on public.review_likes;

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

-- ----- DISHES -----
-- Anyone (anon or logged-in) can view dishes
create policy dishes_select_public
  on public.dishes
  for select using (true);

-- Only the backend (service_role key) can create/update/delete dishes
create policy dishes_write_service
  on public.dishes
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

<<<<<<< HEAD
-- ----- REVIEW LIKES -----
create policy review_likes_select_public
  on public.review_likes
  for select using (true);

create policy review_likes_insert_own
=======
-- ---------- USER PROFILES ----------
-- Store searchable public profile info (duplicated from auth metadata for querying).
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  full_name text,
  school text,
  bio text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists profiles_select_public on public.user_profiles;
drop policy if exists profiles_upsert_owner on public.user_profiles;

create policy profiles_select_public
  on public.user_profiles
  for select using (true);

create policy profiles_upsert_owner
  on public.user_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- FOLLOWS ----------
create table if not exists public.user_follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp not null default now(),
  unique (follower_id, followed_id)
);

alter table public.user_follows enable row level security;

drop policy if exists follows_select_public on public.user_follows;
drop policy if exists follows_insert_owner on public.user_follows;
drop policy if exists follows_delete_owner on public.user_follows;

create policy follows_select_public
  on public.user_follows
  for select using (true);

create policy follows_insert_owner
  on public.user_follows
  for insert to authenticated
  with check (auth.uid() = follower_id);

create policy follows_delete_owner
  on public.user_follows
  for delete to authenticated
  using (auth.uid() = follower_id);

-- ---------- REVIEW LIKES ----------
create table if not exists public.review_likes (
  id uuid default gen_random_uuid() primary key,
  rating_id integer not null references public.dish_ratings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamp not null default now(),
  unique (rating_id, user_id)
);

alter table public.review_likes enable row level security;

drop policy if exists likes_select_public on public.review_likes;
drop policy if exists likes_insert_owner on public.review_likes;
drop policy if exists likes_delete_owner on public.review_likes;

create policy likes_select_public
  on public.review_likes
  for select using (true);

create policy likes_insert_owner
>>>>>>> main
  on public.review_likes
  for insert to authenticated
  with check (auth.uid() = user_id);

<<<<<<< HEAD
create policy review_likes_delete_own
  on public.review_likes
  for delete to authenticated
  using (auth.uid() = user_id);
=======
create policy likes_delete_owner
  on public.review_likes
  for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_review_likes_rating on public.review_likes (rating_id);
create index if not exists idx_user_follows_followed on public.user_follows (followed_id);
>>>>>>> main
