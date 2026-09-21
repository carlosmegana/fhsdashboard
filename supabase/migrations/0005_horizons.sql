-- Flow Habit System — Weekly / Monthly / Quarterly-Yearly content
--
-- Adds what the three new pages need, following the design rule "each page
-- writes what the page below reads":
--   * New item categories on the existing `items` table (same RLS, same
--     editing UI): weekly friction, root issues, and the goal ladder
--     (quarter / year / three-year). `week_start` scopes friction to a week.
--   * `zones` (the 7 FHS life zones, pre-named, renameable) and `zone_scores`
--     (one 1-10 score per zone per month). Weekly reads the latest score,
--     Monthly writes this month's.
--   * `profiles.life_vision`: a single free-text field written yearly.
-- Purely additive.

-- ---------------------------------------------------------------------------
-- items: widen the category check and add week scoping
-- ---------------------------------------------------------------------------
alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check check (
  category in (
    'keystone_habits', 'issues', 'valores', 'metas', 'tasks',
    'friction', 'root_issues', 'quarter_goals', 'year_goals', 'three_year_goals'
  )
);

-- Monday of the week a friction item belongs to. NULL for every other category.
alter table public.items add column if not exists week_start date;

-- ---------------------------------------------------------------------------
-- profiles: life vision (yearly free text)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists life_vision text not null default '';

-- ---------------------------------------------------------------------------
-- zones: 7 named zones per user
-- ---------------------------------------------------------------------------
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null check (position between 1 and 7),
  name text not null default '',
  unique (user_id, position)
);

alter table public.zones enable row level security;

drop policy if exists "zones_select_own" on public.zones;
create policy "zones_select_own" on public.zones for select using (auth.uid() = user_id);
drop policy if exists "zones_insert_own" on public.zones;
create policy "zones_insert_own" on public.zones for insert with check (auth.uid() = user_id);
drop policy if exists "zones_update_own" on public.zones;
create policy "zones_update_own" on public.zones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "zones_delete_own" on public.zones;
create policy "zones_delete_own" on public.zones for delete using (auth.uid() = user_id);

-- Give every existing account the 7 FHS zones, already named. Accounts created
-- after this migration get them from the app on first visit to the Monthly page
-- (see fetchZones / DEFAULT_ZONE_NAMES). Safe to re-run.
insert into public.zones (user_id, position, name)
select p.id, z.pos, z.zone_name
  from public.profiles p
 cross join (values
   (1, 'Salud'),
   (2, 'Amor'),
   (3, 'Crecimiento'),
   (4, 'Trabajo'),
   (5, 'Dinero'),
   (6, 'Experiencias'),
   (7, 'Trascendencia')
 ) as z (pos, zone_name)
on conflict (user_id, position) do nothing;

-- ---------------------------------------------------------------------------
-- zone_scores: one 1-10 score per zone per month (month = first of month)
-- ---------------------------------------------------------------------------
create table if not exists public.zone_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  month date not null,
  score integer not null check (score between 1 and 10),
  unique (zone_id, month)
);

create index if not exists zone_scores_user_month_idx on public.zone_scores (user_id, month);

alter table public.zone_scores enable row level security;

drop policy if exists "zone_scores_select_own" on public.zone_scores;
create policy "zone_scores_select_own" on public.zone_scores for select using (auth.uid() = user_id);
drop policy if exists "zone_scores_insert_own" on public.zone_scores;
create policy "zone_scores_insert_own" on public.zone_scores for insert with check (auth.uid() = user_id);
drop policy if exists "zone_scores_update_own" on public.zone_scores;
create policy "zone_scores_update_own" on public.zone_scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "zone_scores_delete_own" on public.zone_scores;
create policy "zone_scores_delete_own" on public.zone_scores for delete using (auth.uid() = user_id);
