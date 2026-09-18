-- Flow Habit System — streamlined invites + owner role
--
-- Before: every invite code was single-use and had to be inserted by hand in
-- the SQL editor. Now:
--   * profiles.is_admin marks the owner(s). The FIRST account ever created
--     becomes admin automatically (see handle_new_user), so a fresh project
--     bootstraps itself. Promote others with:
--       update public.profiles set is_admin = true
--        where id = (select id from auth.users where email = 'x@y.com');
--   * invites can be multi-use (max_uses), can expire (expires_at) and can be
--     revoked (revoked_at). Admins create them from the in-app /admin page.
--   * invite_redemptions records who used which code and when.
--   * claim_invite() atomically consumes one use, so two signups racing for
--     the last use of a code cannot both succeed.
--
-- Purely additive: existing rows keep working (max_uses defaults to 1, and a
-- code that was already used gets use_count = 1 backfilled).

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.invites
  add column if not exists max_uses integer not null default 1
    check (max_uses >= 1),
  add column if not exists use_count integer not null default 0
    check (use_count >= 0),
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- Legacy single-use codes that were already redeemed count as fully used.
update public.invites
   set use_count = 1
 where used_by is not null and use_count = 0;

create table if not exists public.invite_redemptions (
  id bigint generated always as identity primary key,
  code text not null references public.invites (code) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  redeemed_at timestamptz not null default now()
);

-- Same posture as invites: RLS on, no policies, service-role only.
alter table public.invite_redemptions enable row level security;

-- ---------------------------------------------------------------------------
-- First user becomes admin. Replaces the 0001 version of this trigger function
-- (same trigger, same name). `not exists (profiles)` is evaluated before the
-- insert, so only the very first signup gets the flag.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, is_admin)
  values (new.id, not exists (select 1 from public.profiles))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- claim_invite: atomically consume one use of a code for a new user. Returns
-- true on success, false if the code is unknown, revoked, expired or used up.
-- Called only by the signup server action through the service-role key.
-- ---------------------------------------------------------------------------
create or replace function public.claim_invite(
  p_code text,
  p_user_id uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  update public.invites
     set use_count = use_count + 1,
         used_by = p_user_id,
         used_at = now()
   where code = p_code
     and revoked_at is null
     and use_count < max_uses
     and (expires_at is null or expires_at > now())
  returning code into v_code;

  if v_code is null then
    return false;
  end if;

  insert into public.invite_redemptions (code, user_id, email)
  values (p_code, p_user_id, p_email);

  return true;
end;
$$;

revoke execute on function public.claim_invite(text, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_invite(text, uuid, text) to service_role;
