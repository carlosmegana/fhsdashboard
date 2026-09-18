-- Personal Growth Canvas — measurable, cadence-based keystone habits
-- Turns keystone habits from a plain daily boolean into optionally-measurable
-- items with a target amount and a per-habit reset cadence (daily/weekly/monthly).
-- Purely additive: every new column has a default, so existing habits become
-- plain daily checkboxes with no data change.
--
-- Only keystone_habits use these columns; other categories keep the defaults and
-- ignore them.

alter table public.items
  -- Measurable config (persist across resets). target NULL = plain checkbox habit.
  add column if not exists target numeric,
  add column if not exists unit text,
  add column if not exists step numeric not null default 1,
  -- Today-or-window's logged amount. Reset to 0 on period rollover.
  add column if not exists progress numeric not null default 0,
  -- Reset cadence and the anchor date of the habit's current window.
  add column if not exists period text not null default 'daily'
    check (period in ('daily', 'weekly', 'monthly')),
  add column if not exists period_start date not null default current_date;
