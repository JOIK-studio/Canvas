-- Canvas (rPlace-style social pixel app) schema for Supabase
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  bio text default '' check (char_length(bio) <= 280),
  avatar_url text,
  theme_preference text not null default 'dark' check (theme_preference in ('light', 'dark')),
  coins integer not null default 0,
  pixels_inventory integer not null default 0,
  recharge_seconds integer not null default 30 check (recharge_seconds between 10 and 30),
  settings jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  grid jsonb not null,
  pixels_used integer not null default 0,
  like_count integer not null default 0,
  boost_count integer not null default 0,
  remix_of uuid references public.creations(id) on delete set null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creation_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creation_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid not null references public.creations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create table if not exists public.boosts (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid not null references public.creations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  coins_spent integer not null default 5 check (coins_spent > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.pixel_shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_key text not null,
  pixels_amount integer not null check (pixels_amount > 0),
  coins_spent integer not null check (coins_spent > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.creation_views (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid not null references public.creations(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  session_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.open_canvas_events (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid references public.creations(id) on delete cascade,
  event_type text not null check (event_type in ('publish', 'like', 'boost', 'remix', 'shop')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_creations_created_at on public.creations(created_at desc);
create index if not exists idx_creations_author on public.creations(author_id);
create index if not exists idx_comments_creation on public.comments(creation_id, created_at desc);
create index if not exists idx_open_canvas_events_created_at on public.open_canvas_events(created_at desc);
create index if not exists idx_creation_views_creation on public.creation_views(creation_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_creations_updated_at on public.creations;
create trigger trg_creations_updated_at
before update on public.creations
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'pixel_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.creations enable row level security;
alter table public.creation_likes enable row level security;
alter table public.comments enable row level security;
alter table public.boosts enable row level security;
alter table public.pixel_shop_orders enable row level security;
alter table public.open_canvas_events enable row level security;
alter table public.creation_views enable row level security;

-- Public read access for public creations/comments/events
create policy if not exists "read public profiles"
on public.profiles for select
using (true);

create policy if not exists "read public creations"
on public.creations for select
using (is_public = true);

create policy if not exists "read comments"
on public.comments for select
using (true);

create policy if not exists "read open events"
on public.open_canvas_events for select
using (true);

create policy if not exists "read creation views"
on public.creation_views for select
using (true);

-- User ownership policies
create policy if not exists "users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy if not exists "users insert own creations"
on public.creations for insert
with check (auth.uid() = author_id);

create policy if not exists "users update own creations"
on public.creations for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy if not exists "users delete own creations"
on public.creations for delete
using (auth.uid() = author_id);

create policy if not exists "users like creations"
on public.creation_likes for insert
with check (auth.uid() = user_id);

create policy if not exists "users unlike creations"
on public.creation_likes for delete
using (auth.uid() = user_id);

create policy if not exists "users comment"
on public.comments for insert
with check (auth.uid() = author_id);

create policy if not exists "users delete own comments"
on public.comments for delete
using (auth.uid() = author_id);

create policy if not exists "users create boosts"
on public.boosts for insert
with check (auth.uid() = author_id);

create policy if not exists "users insert own orders"
on public.pixel_shop_orders for insert
with check (auth.uid() = user_id);

create policy if not exists "users read own orders"
on public.pixel_shop_orders for select
using (auth.uid() = user_id);

drop policy if exists "users create open events" on public.open_canvas_events;
create policy "users create open events"
on public.open_canvas_events for insert
with check (auth.uid() is not null);

drop policy if exists "users create views" on public.creation_views;
create policy "users create views"
on public.creation_views for insert
with check (auth.uid() = viewer_id);

-- Recount helper
create or replace function public.recount_creation_stats(p_creation_id uuid)
returns void
language plpgsql
as $$
begin
  update public.creations c
  set
    like_count = (select count(*) from public.creation_likes l where l.creation_id = p_creation_id),
    boost_count = (select count(*) from public.boosts b where b.creation_id = p_creation_id)
  where c.id = p_creation_id;
end;
$$;

create or replace view public.profile_stats as
select
  p.id,
  p.username,
  count(distinct c.id) as creation_count,
  coalesce(sum(c.like_count), 0) as total_likes,
  coalesce(sum(c.boost_count), 0) as total_boosts,
  coalesce(sum((c.grid->>'s')::int), 0) as grid_rows,
  coalesce(count(distinct cv.id), 0) as total_views
from public.profiles p
left join public.creations c on c.author_id = p.id
left join public.creation_views cv on cv.creation_id = c.id
group by p.id, p.username;
