create table if not exists public.review_likes (
  id         integer generated always as identity primary key,
  rating_id  integer not null references public.dish_ratings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade
               default auth.uid(),
  created_at timestamp not null default now(),
  unique (rating_id, user_id)
);

create index if not exists idx_review_likes_rating
  on public.review_likes (rating_id);

alter table public.review_likes enable row level security;

drop policy if exists review_likes_select_public on public.review_likes;
drop policy if exists review_likes_insert_own on public.review_likes;
drop policy if exists review_likes_delete_own on public.review_likes;

create policy review_likes_select_public
  on public.review_likes
  for select using (true);

create policy review_likes_insert_own
  on public.review_likes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy review_likes_delete_own
  on public.review_likes
  for delete to authenticated
  using (auth.uid() = user_id);
