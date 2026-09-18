# Flow Habit System dashboard

A personal-growth dashboard for the Flow Habit System community and coaching
clients. Four pages, one per time horizon: **Daily**, **Weekly**, **Monthly**,
and **Quarterly & Yearly**. Each signed-in person has their own private data.

Accounts are invite-only. The owner creates invite links from the in-app
**Admin** page; a link can be single-use or shared with a whole cohort.

Built on Next.js 16, React 19, Tailwind CSS v4 and Supabase (auth + Postgres),
deployed on Vercel.

## Getting it running

See [SETUP.md](SETUP.md). It walks through creating the Supabase project,
running the migrations, connecting Vercel, and creating the first (owner)
account.

## Development

```bash
cp .env.example .env.local   # fill in the three Supabase values
npm install
npm run dev
```

`npm run lint` and `npm run build` must pass before pushing.

## Where things live

- `src/app/(app)/` — the four horizon pages and the admin page, wrapped in a
  shared layout with the top navigation.
- `src/app/login/` — sign in / invite-gated sign up.
- `src/components/` — dashboard cards and item rows; `admin/` holds the invite
  form and copy-link button.
- `src/lib/db.ts` — every read/write against Supabase for the Daily page.
- `src/lib/invites.ts` — invite code generation and status rules.
- `src/app/globals.css` — the design tokens. Change the palette here.
- `supabase/migrations/` — the database schema, applied in order.
- `.claude/handoff.md` — detailed notes on conventions and gotchas.
