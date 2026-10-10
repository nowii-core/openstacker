-- OpenStacker Pro — optional Supabase schema
-- Run in Supabase SQL Editor. Uses the public anon/publishable key only in the browser.
-- Never expose a service_role key in client-side code.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 32),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  tool_id text not null check (char_length(tool_id) between 1 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tool_id, user_id)
);

create table if not exists public.ratings (
  tool_id text not null check (char_length(tool_id) between 1 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (tool_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null check (char_length(tool_id) between 1 and 120),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 900),
  created_at timestamptz not null default now()
);

create table if not exists public.tool_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  url text not null check (url ~ '^https?://'),
  category text not null check (char_length(category) between 2 and 60),
  description text not null check (char_length(trim(description)) between 2 and 900),
  price_model text not null check (price_model in ('free','freemium','paid')),
  license text,
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ratings_tool_id_idx on public.ratings(tool_id);
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists comments_tool_created_idx on public.comments(tool_id, created_at desc);
create index if not exists submissions_status_created_idx on public.tool_submissions(status, created_at desc);

-- Create one profile per auth user. Usernames include a short suffix so duplicates cannot block signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  safe_name text;
begin
  raw_name := coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, 'member'), '@', 1));
  safe_name := regexp_replace(lower(trim(raw_name)), '[^a-z0-9_.-]', '', 'g');
  if char_length(safe_name) < 2 then safe_name := 'member'; end if;
  safe_name := left(safe_name, 23) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  insert into public.profiles (id, username, role)
  values (new.id, safe_name, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_openstacker on auth.users;
create trigger on_auth_user_created_openstacker
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_openstacker_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_openstacker_admin() from public;
grant execute on function public.is_openstacker_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.tool_submissions enable row level security;

-- Profile usernames are public; only the username column may be changed by the account owner.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username) on public.profiles to authenticated;
drop policy if exists "profiles visible to everyone" on public.profiles;
create policy "profiles visible to everyone" on public.profiles for select using (true);
drop policy if exists "users update own username" on public.profiles;
create policy "users update own username" on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

-- Favorites are private to each signed-in account.
grant select, insert, delete on public.favorites to authenticated;
drop policy if exists "users view own favorites" on public.favorites;
create policy "users view own favorites" on public.favorites for select to authenticated
using (auth.uid() = user_id);
drop policy if exists "users create own favorites" on public.favorites;
create policy "users create own favorites" on public.favorites for insert to authenticated
with check (auth.uid() = user_id);
drop policy if exists "users delete own favorites" on public.favorites;
create policy "users delete own favorites" on public.favorites for delete to authenticated
using (auth.uid() = user_id);

-- Ratings are public to read; only a signed-in owner can create/update their own rating.
grant select on public.ratings to anon, authenticated;
grant insert, update, delete on public.ratings to authenticated;
drop policy if exists "ratings are public" on public.ratings;
create policy "ratings are public" on public.ratings for select using (true);
drop policy if exists "users create own ratings" on public.ratings;
create policy "users create own ratings" on public.ratings for insert to authenticated
with check (auth.uid() = user_id);
drop policy if exists "users update own ratings" on public.ratings;
create policy "users update own ratings" on public.ratings for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users delete own ratings" on public.ratings;
create policy "users delete own ratings" on public.ratings for delete to authenticated
using (auth.uid() = user_id);

-- Comments are public to read. Users can publish/delete only their own comments.
grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;
drop policy if exists "comments are public" on public.comments;
create policy "comments are public" on public.comments for select using (true);
drop policy if exists "users create own comments" on public.comments;
create policy "users create own comments" on public.comments for insert to authenticated
with check (auth.uid() = user_id);
drop policy if exists "users delete own comments or admin" on public.comments;
create policy "users delete own comments or admin" on public.comments for delete to authenticated
using (auth.uid() = user_id or public.is_openstacker_admin());

-- Public may see published submissions; submitters can see their own; admins can moderate.
grant select on public.tool_submissions to anon, authenticated;
grant insert on public.tool_submissions to authenticated;
grant update, delete on public.tool_submissions to authenticated;
drop policy if exists "published submissions and own submissions visible" on public.tool_submissions;
create policy "published submissions and own submissions visible" on public.tool_submissions for select
using (status = 'published' or submitted_by = auth.uid() or public.is_openstacker_admin());
drop policy if exists "users submit for review" on public.tool_submissions;
create policy "users submit for review" on public.tool_submissions for insert to authenticated
with check (auth.uid() = submitted_by and status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "admins moderate submissions" on public.tool_submissions;
create policy "admins moderate submissions" on public.tool_submissions for update to authenticated
using (public.is_openstacker_admin()) with check (public.is_openstacker_admin());
drop policy if exists "admins delete submissions" on public.tool_submissions;
create policy "admins delete submissions" on public.tool_submissions for delete to authenticated
using (public.is_openstacker_admin());

-- Promote your own account only after signing up and finding its UUID in Authentication > Users:
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
