-- Personal Growth Canvas — initial schema
-- Adds per-user auth-backed storage to replace the previous localStorage model.
-- Two tables: `profiles` (holds the daily-reset anchor) and `items` (every card
-- item across the five categories). Both are protected by Row Level Security so a
-- user can only ever read or write their own rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds the daily-reset anchor date.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  last_active_date date not null default current_date
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- items: every card item. `id` keeps the app's client-generated
-- `{prefix}-{uuid}` values (kh-, is-, vl-, mt-, tk-) so inserts stay optimistic.
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (
    category in ('keystone_habits', 'issues', 'valores', 'metas', 'tasks')
  ),
  text text not null default '',
  completed boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists items_user_category_created_idx
  on public.items (user_id, category, created_at);

alter table public.items enable row level security;

create policy "items_select_own"
  on public.items for select
  using (auth.uid() = user_id);

create policy "items_insert_own"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "items_update_own"
  on public.items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "items_delete_own"
  on public.items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profiles row automatically on signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
