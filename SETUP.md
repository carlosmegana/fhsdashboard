# Setup guide

Everything you need to go from this repo to a live app. Two services are
involved and both have free tiers:

- **Supabase** stores the accounts and the data. You already have an account.
- **Vercel** hosts the app itself and gives it a public URL. Think of it as the
  web server: you connect it to this GitHub repo once, and every push to `main`
  becomes a new deploy automatically. Nothing to install or manage.

Local development is optional; the app can be run entirely from Vercel.

---

## 1. Supabase project

1. Go to <https://supabase.com/dashboard> and click **New project**. Pick any
   name (for example `fhs-dashboard`), set a database password, and choose the
   region closest to your users. Wait a minute for it to provision.

2. **Run the migrations.** Open **SQL Editor** (left sidebar) and paste the
   contents of each file in `supabase/migrations/`, in order, clicking **Run**
   after each one:
   1. `0001_init.sql`
   2. `0002_invites.sql`
   3. `0003_habit_targets.sql`
   4. `0004_invites_v2.sql`

   Each one should finish with "Success. No rows returned".

3. **Turn off public signups.** This is the real lock on the door: without it,
   anyone with the public key could create an account by calling the API
   directly, bypassing invites.
   - **Authentication → Sign In / Providers** → find **Allow new users to sign
     up** → turn it **OFF**.
   - Still under **Email** provider settings: make sure **Confirm email** is
     **OFF**. (Accounts are created through invites, which already vouch for
     the person, and there is no email sender configured.)

4. **Collect the three keys.** Go to **Project Settings → API**:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`. Treat this one like a
     password. It bypasses every security rule and must only ever live in
     server-side settings, never in the browser and never in the repo.

---

## 2. Vercel

1. Go to <https://vercel.com/signup> and sign up **with GitHub**. That lets
   Vercel see your repos.

2. Click **Add New → Project**, pick `carlosmegana/fhsdashboard`, and click
   **Import**. Vercel detects Next.js by itself; leave the build settings alone.

3. Before clicking Deploy, open **Environment Variables** and add the three
   values from step 1.4, with exactly these names:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

4. Click **Deploy**. About a minute later you get a URL like
   `fhsdashboard.vercel.app`. That is the live app. You can attach your own
   domain later under **Settings → Domains**.

From now on, every push to `main` redeploys automatically. Pull requests get
their own preview URLs.

---

## 3. Your first account (you become the owner)

The very first account created in a fresh database is automatically the
**admin**. To create it you need one invite code, and the migrations seeded
one for exactly this purpose:

1. Open the live app, click **Crear cuenta**.
2. Email, password, and invite code `CANVAS-WELCOME`.
3. You are in. The **Admin** link now appears in the top bar.

That seeded code is single-use and is now spent. From here on you create
invites from the Admin page.

If you ever need to make someone else an admin, run this in the SQL Editor:

```sql
update public.profiles
   set is_admin = true
 where id = (select id from auth.users where email = 'person@example.com');
```

---

## 4. Inviting people

**Admin → New invite**:

- **Label**: a note for yourself, like "FHS cohort · Sept 2026" or a client's
  name.
- **Uses**: how many accounts this one code can create. `1` for a personal
  invite; `25` for a cohort so you share a single link with the whole group.
- **Expires in**: days until the link stops working. `0` means never.

Click **Create invite**, then **Copy link**. The link looks like
`https://your-app.vercel.app/login?invite=FHS-K7PQ-M3WX` and opens the signup
form with the code already filled in. Send it however you like.

The Admin page also shows every invite's status (active, used up, expired,
revoked), lets you **Revoke** one, and lists recent signups with the code
each person used.

---

## 5. Running locally (optional)

```bash
cp .env.example .env.local   # then paste the three values in
npm install
npm run dev
```

Open <http://localhost:3000>. The local app talks to the same Supabase
project as production, so be aware you are editing real data.

Before pushing, `npm run lint` and `npm run build` should both pass.
