-- Flow Habit System — Issue en Foco (spotlighted issue)
--
-- Issues are ONE list (category `root_issues`, kept on the Monthly page). A
-- person picks one of them as their spotlight, and the Daily page shows only
-- that one. Exactly one spotlight per person, so it lives on their profile.
-- Deleting the spotlighted issue clears the spotlight automatically.
--
-- Also folds the old, separate Daily issues list (category `issues`) into the
-- one shared list, so nothing anyone typed there is lost. Safe to re-run.

alter table public.profiles
  add column if not exists spotlight_issue_id text
    references public.items (id) on delete set null,
  add column if not exists spotlight_since timestamptz;

update public.items
   set category = 'root_issues'
 where category = 'issues';
