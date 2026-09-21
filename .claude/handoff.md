# Agent Handoff: Flow Habit System dashboard

> **Sept 2026 — repo moved and reshaped.** This project now lives at
> `carlosmegana/fhsdashboard` (owner: Carlos). It was imported from the
> original `behavior-tracking-dashboard` and then changed as follows. The
> sections below the rule are the original notes and remain accurate for
> everything they describe (data layer, habit reset model, mutation patterns).
>
> **What changed**
> - **Four pages, one app shell.** `src/app/(app)/layout.tsx` renders `AppNav`
>   (Daily · Weekly · Monthly · Yearly, plus sign-out) and
>   a content column. Daily (`/`) is the original dashboard; `/weekly`,
>   `/monthly`, `/yearly` are placeholders (`ComingSoon`) whose content is
>   being defined page by page with the owner. `Dashboard.tsx` no longer owns
>   a header or sign-out; it renders a page title row + the five cards.
> - **Restyle to a paper-like look (reference: tweek.so).** All colors go
>   through tokens in `globals.css` (`@theme`: paper, paper-2, line, line-2,
>   ink, ink-2, ink-3, good, danger, note, note-line). Font is Inter. No
>   orange/stone/amber classes remain; do not reintroduce raw palette classes.
>   Lists use `divide-y divide-line`; cards are `rounded-lg border border-line`.
> - **Signup is OPEN; the invite system is gone from the app.** The owner
>   decided invites were friction, not protection. `signUp` now calls
>   `supabase.auth.signUp` through the SSR client (no service-role key, no
>   `admin.ts`, no `SUPABASE_SERVICE_ROLE_KEY` env var). Whether accounts can
>   be created is the Supabase switch "Allow new users to sign up"; when OFF
>   the action maps `signup_disabled` to a friendly message. Migrations
>   `0002`/`0004` still create `invites`/`invite_redemptions`/`claim_invite`
>   (harmless, unused). `0004` also adds `profiles.is_admin` and makes the
>   FIRST user admin via `handle_new_user`; `getCurrentUser()` in
>   `src/lib/auth.ts` exposes it but nothing renders on it yet.
> - **Horizon pages** (`0005_horizons.sql`). Design rule from the owner's doc:
>   *each page writes what the page below reads; nothing is written twice.*
>   Read zones use `ReadOnlyList`, write zones use `ItemList` (a one-category
>   version of the Dashboard patterns). New `items` categories: `friction`
>   (weekly, scoped by `items.week_start` = Monday), `root_issues`,
>   `quarter_goals`, `year_goals`, `three_year_goals`. `fetchDashboard` now
>   filters to `DAILY_CATEGORIES`. Tables `zones` (7 per user, created
>   lazily by `fetchZones`, pre-named from `DEFAULT_ZONE_NAMES` in types.ts:
>   Salud · Amor · Crecimiento · Trabajo · Dinero · Experiencias ·
>   Trascendencia — keep that list in sync with the seed block in 0005;
>   names stay editable) and `zone_scores` (1-10 per zone
>   per month, upsert on `zone_id,month`). `profiles.life_vision` is a single
>   textarea saved on blur. Page contents: Weekly = Metas del Mes (read, from
>   Daily's `metas`), 7 Zonas last score (read), Friccion (write). Monthly =
>   Metas del Trimestre + del Ano (read), 7 Zonas score (write), Issues Raiz
>   (write). Quarterly & Yearly = Vision de Vida, Metas a 3 Anos / del Ano /
>   del Trimestre (write). Daily card titles: "Keystone Habits" and "Metas
>   del Mes" per the doc. Still open (owner's call): Energia, Issue en Foco,
>   week-scoped Tareas, Creencias, zone trend on the yearly page.
> - **Every page-level read must surface its failure.** `ItemList`,
>   `ReadOnlyList`, `ZonesCard` and `LifeVisionCard` catch the initial fetch
>   and render `LoadError` instead of leaving a skeleton pulsing forever.
>   `src/lib/loadError.ts` classifies PostgREST `PGRST205/PGRST202/42P01/42703`
>   as `missing_schema`, which renders "aplica la migracion 0005" — an
>   un-migrated database used to look identical to an empty page. Keep this
>   pattern on any new data component.
> - **Migrations are applied by hand in the Supabase SQL editor**, so every
>   file must be safely re-runnable: `create policy` has no IF NOT EXISTS, so
>   each one is preceded by `drop policy if exists`. All five were verified by
>   running them twice against a real Postgres 16 with stubbed `auth.users` /
>   `auth.uid()`; do the same before shipping a new migration.
> - **Copy language is Spanglish by design.** Existing card copy stays Spanish
>   without accents; new structural UI (nav) is English. Ask the owner
>   before renaming labels.
> - **Verification without a real Supabase**: a ~60-line mock of
>   `/auth/v1/user` and `/rest/v1/*` plus a hand-built `sb-<ref>-auth-token`
>   cookie (`base64-` + base64url JSON session with a decodable fake JWT) is
>   enough to drive `next start` with Playwright and screenshot every page.
> - Docs: `SETUP.md` (Supabase + Vercel), `.env.example`. README rewritten.

---

**Status:** Live. The app has **Supabase email + password auth** and a **Postgres backend** (previously localStorage, single implicit user). Signups are **invite-only**. Auth + DB + invite flow were verified end-to-end with headless Playwright (all checks green). **Keystone habits are now optionally measurable with per-habit daily/weekly/monthly reset cadences** (migration `0003`, applied); the new schema + write paths (config, progress, cadence, check constraint) were verified live against Postgres. This document brings a new agent up to speed on the current state, conventions, and gotchas.

## What the app is

Single-page Spanish-language dashboard ("Mi Dashboard") in a Lean Canvas grid: 5 cards — Habitos Clave, Valores, Metas, Problemas, Tareas. Each signed-in user has their own data in Supabase Postgres (Row Level Security scoped to `auth.uid()`). Task checkboxes persist. Every item supports inline edit, delete, and an optional post-it note. No accents/ñ anywhere in UI copy ("Habitos", "dia", "Contrasena") — match this.

**Keystone habits are measurable + cadence-based.** A habit with no `target` is a plain checkbox. Give it a target (via the ⚙ config panel: Meta / Unidad / Paso / cadence) and it becomes a stepper `[−] 10 / 15 min [+]` with a progress bar (orange, turns emerald + check when the target is reached). **Any progress > 0 counts as "done" for the window** (partial credit — 10 of 15 min still marks the day). Each habit **resets on its own cadence** — daily, weekly (Monday), or monthly (the 1st) — not globally. See the reset model below.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 (`@import "tailwindcss"`, no config) · Nunito via `next/font` · **Supabase** (Auth + Postgres, `@supabase/ssr` + `@supabase/supabase-js`) · deployed on Vercel, auto-deploys on push to `main`.

## Auth + data architecture

- **Auth:** email + password. Email confirmation is **OFF** in the Supabase dashboard (single-user-ish app) → signup logs you straight in.
- **Invite-only:** public signups are **disabled at the Supabase platform** (Authentication → Sign In / Providers → "Allow new users to sign up" OFF). This is the real security control — the publishable key means the public `/auth/v1/signup` endpoint would otherwise be open to anyone. New users are created only by the signup server action, which validates a single-use code and calls the **Admin API** with the service-role key.
- **Per-user data** lives in Postgres, protected by RLS. The browser talks to Supabase directly (anon/publishable key) for reads/writes; RLS enforces ownership server-side.

## Database schema (see `supabase/migrations/`)

- `0001_init.sql`
  - **`profiles`** — one row per user (`id` = `auth.users.id`), `last_active_date` (daily-reset anchor). RLS: own row only. A `handle_new_user()` trigger on `auth.users` auto-creates the row on signup.
  - **`items`** — every card item. `id text pk` keeps the app's client-generated `{prefix}-{uuid}` ids. `user_id uuid default auth.uid()`, `category` (check constraint over the 5 keys), `text`, `completed`, `note` (nullable), `created_at` (ordering key). RLS: 4 policies, all `auth.uid() = user_id`.
- `0002_invites.sql`
  - **`invites`** — `code text pk`, `note`, `used_by`, `used_at`. **RLS enabled with NO policies** → zero access for anon/authenticated clients (can't read or enumerate codes). Only the service-role key (server-side) touches it. Seeds one code `CANVAS-WELCOME`.
  - Create more codes via SQL editor: `insert into public.invites (code, note) values ('AMIGO-2026', 'for a friend');`
- `0003_habit_targets.sql` — measurable, cadence-based keystone habits
  - Adds six **keystone-habit** columns to `items`, all defaulted (purely additive — existing habits become plain daily checkboxes, no data change). Other categories keep the defaults and ignore them.
    - `target numeric` (nullable) — the goal amount; **NULL = plain checkbox habit**. Persists across resets.
    - `unit text` (nullable), `step numeric default 1` — display unit and the +/− increment. Persist across resets.
    - `progress numeric default 0` — logged amount in the current window. **Reset to 0 on period rollover.**
    - `period text default 'daily'` check `in ('daily','weekly','monthly')` — reset cadence.
    - `period_start date default current_date` — anchor date of the habit's current window; advances on reset.
  - `profiles.last_active_date` is now **unused by the reset logic** (see reset model below) — the column and the `handle_new_user` trigger remain, untouched.

## Environment variables

`.env.local` (gitignored) and Vercel both need:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key — safe in browser)
- `SUPABASE_SERVICE_ROLE_KEY` — **SERVER-ONLY, never prefix with `NEXT_PUBLIC_`.** Used only by the signup server action. Bypasses RLS.

## File map (new/changed pieces in bold)

```
src/
  app/
    layout.tsx          # lang="es", Nunito, body bg/text
    page.tsx            # renders <Dashboard /> (route gated by proxy)
    globals.css
    login/
      page.tsx          # server component; redirects to / if already authed
      actions.ts        # "use server": signIn, signUp (invite-gated)
    auth/
      actions.ts        # "use server": signOut
  components/
    Dashboard.tsx       # "use client"; owns state; Supabase-backed mutations; "Cerrar sesion"
                        #   + adjustProgress() and saveHabitConfig() for measurable habits
    AuthForm.tsx        # login/signup form (controlled inputs); invite field in signup mode
    HabitItem.tsx       # checkbox OR stepper+progress-bar+cadence-pill; inline ConfigButton +
                        #   HabitConfigPanel (Meta/Unidad/Paso/cadence). Exports HabitConfig type.
    DashboardCard, TaskItem, ListItem, EditableText,
    AddItemButton, DeleteButton, NoteButton, NotePanel, useItemNote.ts
  lib/
    supabase/
      client.ts         # createBrowserClient (browser)
      server.ts         # createServerClient (async cookies) for RSC/actions
      proxy.ts          # updateSession(): refresh session + route gating
      admin.ts          # service-role client (SERVER-ONLY, invites/admin createUser)
    db.ts               # data layer: fetchDashboard, applyDueResets (per-habit),
                        #   runDailyResetIfNeeded, setItemProgress, setHabitConfig, insert/update/delete
    types.ts            # PgcData, Categories, CategoryKey, CATEGORY_PREFIXES,
                        #   Habit (measurable fields), HabitPeriod
    date.ts             # todayStr(), formatDisplayDate (Spanish), periodStartStr(period)
  proxy.ts              # Next 16 Middleware (renamed to Proxy) — see gotcha
supabase/
  migrations/0001_init.sql, 0002_invites.sql
  config.toml
```
(`src/lib/storage.ts` and `seed-data.ts` were removed — localStorage is gone.)

## Key patterns & gotchas — follow these

- **Next.js 16 renamed Middleware → Proxy.** The file is `src/proxy.ts` exporting a `proxy` function (NOT `middleware.ts`/`middleware`). Standard Supabase SSR docs still say `middleware.ts`; adapt. `config.matcher` still works. The build output labels it `ƒ Proxy (Middleware)`.
- **`cookies()` is async** in Next 16 (`await cookies()`), see `lib/supabase/server.ts`.
- **Read the modified Next docs.** `node_modules/next/dist/docs/` — this Next has breaking changes vs training data (AGENTS.md). The proxy rename lives in `01-app/01-getting-started/16-proxy.md`.
- **Controlled auth inputs (React 19 gotcha).** `<form action={...}>` auto-resets after the action runs, wiping uncontrolled fields. `AuthForm` inputs are **controlled** (`useState`) so a failed submit (e.g. bad invite code) doesn't erase the email/password. Don't revert to uncontrolled.
- **All mutations flow through `mutate()` in `Dashboard.tsx`** — optimistic local state update, then a fire-and-forget `persist(dbOp)` (background write; on error it logs and re-`fetchDashboard`s to resync).
- **Compute decisions from committed state, not inside the `mutate` updater.** State updaters run async. `saveText` reads `wasNew` from the current `data` BEFORE calling `mutate` to decide insert-vs-update. Reading it inside the updater was a real data-loss bug (always did UPDATE → 0 rows → nothing persisted). Keep this pattern.
- **New items are inserted lazily.** `addItem` only adds to local state; the row is inserted on the first non-empty text save (`insertItem`). Cancelled/empty adds never hit the DB.
- **Habit reset is per-habit and cadence-aware** (replaced the old global `profiles.last_active_date` daily reset). `db.ts#applyDueResets` runs on load (over the already-fetched rows — no extra query) and on tab focus/visibility via `runDailyResetIfNeeded` (name kept, but it now does period resets, not just daily). For each habit it compares `date.ts#periodStartStr(period)` — the start of the window containing today (**daily → today, weekly → that week's Monday, monthly → the 1st**, computed in local time) — to the stored `period_start`; if they differ it zeroes `progress`/`completed` and advances `period_start`. Plain checkbox habits are just `period='daily'`, so they still reset every day.
- **"Any progress counts as done."** For a measurable habit, `completed` mirrors `progress > 0` — `db.ts#setItemProgress` writes both together, and `Dashboard#adjustProgress` sets `completed: next > 0` optimistically. Don't let `completed` drift from that rule. `adjustProgress` clamps at 0 (no upper cap — overshooting a target is fine; the bar just caps at 100%).
- **Changing cadence never triggers a spurious reset.** `db.ts#setHabitConfig` realigns `period_start` to `periodStartStr(newPeriod)` on every config save, so switching daily→weekly mid-window keeps current progress instead of resetting on next load. `target=null` reverts a habit to a plain checkbox.
- **New keystone habits need the habit defaults in local state.** `Dashboard#addItem` seeds a brand-new (not-yet-persisted) habit with `{ step: 1, progress: 0, period: 'daily' }` so `HabitItem` doesn't read `undefined` before the first save. The DB column defaults cover the persisted row.
- **Invite signup flow** (`login/actions.ts#signUp`): validate code (pre-check) → `admin.auth.admin.createUser({ email_confirm: true })` → **atomically claim** the code (`update ... where code and used_by is null`) → on claim failure, roll back with `admin.deleteUser` → sign in via the SSR server client (sets cookies) → redirect. The atomic claim makes codes safely single-use under concurrency.
- **Uncontrolled item-edit inputs stay uncontrolled.** `EditableText`/`NotePanel` still use `defaultValue` + remount + `cancelledRef`. Controlled inputs are used in the AUTH form and in `HabitConfigPanel` — both safe because the config panel is a plain JS sub-form (not a `<form action={...}>` server action), and it mounts fresh each open (rendered only when open) so its state initializes cleanly from the item.
- **Checkbox labels vs click-to-edit, grid order, IDs, empty-text semantics** — unchanged from before (item text is a `role="button"` span; `md:order-*` rearranges DOM order Habitos→Valores→Metas→Problemas→Tareas; ids `{prefix}-${crypto.randomUUID()}`; empty save deletes a brand-new item / reverts an existing one; empty note → `null`).

## Known limitation

Item writes are optimistic/fire-and-forget. Adding an item then reloading/closing the tab within ~100ms can lose that one write before its POST completes. Negligible for normal use; harden (await-on-unload) only if it becomes a real problem.

## Manual Supabase/Vercel setup (not in code)

1. Auth → Providers → Email → **Confirm email OFF**.
2. Auth → Sign In / Providers → **Allow new users to sign up OFF** (invite-only).
3. Run `supabase/migrations/*.sql` in the SQL Editor (or `supabase db push`).
4. Set all three env vars in **Vercel** (incl. `SUPABASE_SERVICE_ROLE_KEY`) before deploying.

## Verification workflow

No test framework in the repo (MVP decision). Verification is headless Playwright via `playwright-core` driving the cached Chromium at `~/Library/Caches/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell`:

1. `npm run build && npm run start -- -p <port>` (kill the port afterward).
2. Drive real flows with role-based locators. Item text appears twice in the a11y tree (sr-only label + visible span) — target `getByRole("button", { name })`. Note there are **two `role="alert"` nodes** (your error `<p>` + Next's route announcer) — assert on the error TEXT, not `getByRole("alert")`.
3. For DB writes, **wait for the actual request** (`page.waitForResponse` on `/rest/v1/items`) before reloading — the app's optimistic write is async.
4. Seed/inspect DB state and invite codes with the **service-role key** over the REST API (`/rest/v1/...`) and Admin API (`/auth/v1/admin/users`). Invite codes are single-use, so seed a fresh `E2E-<ts>` code per run.
5. Assert zero console errors (hydration/logic regressions surface here).
6. Confirm the platform guard: an anon `POST /auth/v1/signup` returns `signup_disabled`.

Always run `npm run lint` and `npm run build` before considering work done.

## Design system

Unchanged from the restyle: warm cream/orange palette, `bg-orange-50` page, white `rounded-2xl` cards with `border-orange-100/70 shadow-sm`, orange accents/pills, amber post-its, Nunito, no dark mode, no shadows beyond `shadow-sm`. Auth form matches (white card, orange `Iniciar sesion`/`Crear cuenta` button).

## Process conventions

- **Git:** commit and push ONLY when the user explicitly asks (per change). Commit trailer: `Co-Authored-By:` the acting Claude model (e.g. `Claude Opus 4.8 <noreply@anthropic.com>`). Pushing `main` triggers the Vercel deploy.
- Repo is **private** (`tomszero/behavior-tracking-dashboard`). Keep it that way — old commits contain personal data.
- `next.config.ts` pins `turbopack.root` (a stray `~/package-lock.json` breaks workspace-root inference). Don't remove it.
- Real user data now lives in **Supabase**, not the browser. Warn before anything touching the DB, auth users, or invite codes.

## Future scope (from PRD §8, not started)

Historical habit tracking · drag-and-drop reordering · dark mode · PWA support · password reset UI · OAuth providers · real SMTP for confirmation/invite emails.
