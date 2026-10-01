-- Flow Habit System — Creencias (beliefs)
--
-- Adds the `beliefs` item category: one shared list, shown and editable on
-- both the Weekly and Monthly pages until its final home is decided.
-- `friction` stays allowed so any rows written while the Weekly page had a
-- Friccion card remain valid; the card itself has been removed from the app.
-- Safe to re-run.

alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check check (
  category in (
    'keystone_habits', 'issues', 'valores', 'metas', 'tasks',
    'friction', 'root_issues', 'quarter_goals', 'year_goals', 'three_year_goals',
    'beliefs'
  )
);
