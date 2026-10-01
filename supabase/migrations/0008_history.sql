-- Flow Habit System — recording history (timelines)
--
-- Until now the app only knew the present: a habit's progress was overwritten
-- at each reset, deleted items vanished, and tasks and goals had no dates.
-- This migration makes the past recordable. History starts the day it runs;
-- nothing earlier can be recovered.
--
--   habit_logs            one row per habit per day it was touched: that
--                         window's progress as of that day, plus the target at
--                         the time, so editing a habit never rewrites its past.
--   profiles.history_since  the day recording began, so timelines can tell
--                         "no data yet" apart from "not done".
--   items.archived_at     hide instead of erase: removing a habit, task or
--                         goal keeps its history.
--   items.completed_at    when a task was checked off.
--   items.status, status_at  goals: open, done (lograda) or dropped
--                         (descartada), and when that happened.
--
-- Safe to re-run.

alter table public.profiles
  add column if not exists history_since date not null default current_date;

alter table public.items
  add column if not exists archived_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists status text not null default 'open',
  add column if not exists status_at timestamptz;

alter table public.items drop constraint if exists items_status_check;
alter table public.items add constraint items_status_check
  check (status in ('open', 'done', 'dropped'));

create table if not exists public.habit_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id text not null references public.items (id) on delete cascade,
  day date not null,
  progress numeric not null default 0,
  target numeric,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  -- user_id leads the key so one person's rows can never collide with another's.
  primary key (user_id, habit_id, day)
);

create index if not exists habit_logs_user_day_idx on public.habit_logs (user_id, day);

alter table public.habit_logs enable row level security;

drop policy if exists "habit_logs_select_own" on public.habit_logs;
create policy "habit_logs_select_own" on public.habit_logs
  for select using (auth.uid() = user_id);
drop policy if exists "habit_logs_insert_own" on public.habit_logs;
create policy "habit_logs_insert_own" on public.habit_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "habit_logs_update_own" on public.habit_logs;
create policy "habit_logs_update_own" on public.habit_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "habit_logs_delete_own" on public.habit_logs;
create policy "habit_logs_delete_own" on public.habit_logs
  for delete using (auth.uid() = user_id);

-- Keep whatever is already ticked in the current window, so today's progress
-- is not missing from the first timeline. period_start is the first day of
-- the habit's current window in the person's own time zone.
insert into public.habit_logs (user_id, habit_id, day, progress, target, completed)
select user_id, id, period_start, progress, target, completed
  from public.items
 where category = 'keystone_habits'
   and (completed or progress > 0)
on conflict (user_id, habit_id, day) do nothing;
