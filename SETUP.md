# Setup guide

Everything you need to go from this repo to a live app. Two services are
involved and both have free tiers:

- **Supabase** stores the accounts and the data.
- **Vercel** hosts the app itself and gives it a public URL. Think of it as the
  web server: you connect it to this GitHub repo once, and every push to `main`
  becomes a new deploy automatically. Nothing to install or manage.

Local development is optional; the app can be run entirely from Vercel.

---

## 1. Supabase project

1. Go to <https://supabase.com/dashboard> and click **New project**. Pick any
   name (for example `fhs-dashboard`), generate a database password and save it
   in your password manager, choose the region closest to your users. Wait a
   minute for it to provision.

2. **Run the migrations.** Open **SQL Editor** (left sidebar) and paste the
   contents of each file in `supabase/migrations/`, in order, clicking **Run**
   after each one:
   1. `0001_init.sql`
   2. `0002_invites.sql`
   3. `0003_habit_targets.sql`
   4. `0004_invites_v2.sql`

   Each one should finish with "Success. No rows returned". If Supabase shows a
   "Potential issue detected" dialog, click **Run query**: the files contain
   harmless "drop if exists" guards and the database is empty anyway.

   (Files 0002 and 0004 create invite tables from an earlier design. The app no
   longer uses them, but they are harmless and 0004 also adds the owner flag
   described below, so run all four.)

3. **Signup settings.** Under **Authentication**:
   - **Allow new users to sign up**: **ON**. Anyone with the app's URL can
     create an account. Turn this OFF whenever you want to close registration;
     the app then shows "El registro esta cerrado por ahora" on the signup form.
   - **Email** provider → **Confirm email**: **OFF**. There is no email sender
     configured, so a confirmation message would never arrive.

4. **Collect the two keys.** Go to **Project Settings → API**:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Both are safe to expose; every read and write is still checked by Row Level
   Security in the database. You do **not** need the service_role / secret key.

---

## 2. Vercel

1. Go to <https://vercel.com/signup> and sign up **with GitHub**. That lets
   Vercel see your repos.

2. Click **Add New → Project**, pick `carlosmegana/fhsdashboard`, and click
   **Import**. Vercel detects Next.js by itself; leave the build settings alone.

3. Before clicking Deploy, open **Environment Variables** and add the two
   values from step 1.4, with exactly these names:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |

4. Click **Deploy**. About a minute later you get a URL like
   `fhsdashboard.vercel.app`. That is the live app. You can attach your own
   domain later under **Settings → Domains**.

From now on, every push to `main` redeploys automatically. Pull requests get
their own preview URLs.

---

## 3. Your first account

Open the live app, click **Crear cuenta**, enter an email and password. Done.

The very first account created in a fresh database is flagged as the owner
(`profiles.is_admin`). Nothing in the app uses that flag yet; it is there for
future owner-only features. To flag someone else later, run this in the SQL
Editor:

```sql
update public.profiles
   set is_admin = true
 where id = (select id from auth.users where email = 'person@example.com');
```

---

## 4. Running locally (optional)

```bash
cp .env.example .env.local   # then paste the two values in
npm install
npm run dev
```

Open <http://localhost:3000>. The local app talks to the same Supabase
project as production, so be aware you are editing real data.

Before pushing, `npm run lint` and `npm run build` should both pass.

---

## Good to know

- **Free-plan pause.** Supabase pauses a free project after about a week with
  no traffic. If the app shows a connection error after a quiet stretch, open
  the Supabase dashboard and click **Restore**; data is intact.
- **Closing the door.** Registration is controlled entirely by the Supabase
  switch in step 1.3. No code change or redeploy needed.
