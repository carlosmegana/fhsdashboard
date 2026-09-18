-- Invite-only signups.
--
-- Public signups must be disabled in the Supabase dashboard (Authentication ->
-- Sign In / Providers -> "Allow new users to sign up" OFF). New accounts are then
-- created only by the signup server action, which validates a code from this
-- table using the service-role key and creates the user via the Admin API.
--
-- RLS is enabled with NO policies, so anon/authenticated clients get zero access
-- (they cannot read or enumerate codes). The service-role key bypasses RLS, so
-- the server action can still read/claim codes.

create table if not exists public.invites (
  code text primary key,
  note text,                                    -- optional label, e.g. who it's for
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
-- Intentionally no policies: locks the table to server-side (service-role) use only.

-- Seed a first code so you can invite yourself / a tester. Replace or add more via
-- the SQL editor, e.g.:
--   insert into public.invites (code, note) values ('AMIGO-2026', 'for a friend');
insert into public.invites (code, note)
values ('CANVAS-WELCOME', 'first invite')
on conflict (code) do nothing;
