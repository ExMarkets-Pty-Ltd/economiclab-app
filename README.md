# EconomicLab App

The separate authenticated EconomicLab application, built with React, Vite, Supabase, and Netlify. It is intended for `app.economiclab.co.za`; it does not change the EconomicLab public website.

## Run locally

1. Use Node.js 20 or newer and install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and **anon/public** key.
3. Start the development server with `npm run dev`.

The browser client only uses the public anon key. Never put a Supabase `service_role` key in a `VITE_` variable or in this repository.

## Database migrations

Four SQL migrations are in `supabase/migrations/`, ordered by their timestamped filenames:

1. `20261110000001_initial_schema.sql` — the eight requested tables, keys, constraints, and indexes.
2. `20261110000002_profile_security.sql` — automatic profile/settings creation for new Auth users, profile visibility, owner-only profile/settings updates, and `updated_at` triggers.
3. `20261110000003_subscription_security.sql` — public plan reads and owner-only subscription reads; client roles cannot write plans or subscriptions.
4. `20261110000004_social_and_user_data_security.sql` — post, follower, notification, and saved-insight RLS policies and grants.

The migrations use plain `CREATE TABLE` and `CREATE POLICY` statements rather than `IF NOT EXISTS` or replacement operations. If a target table, function, or policy already exists, the migration fails rather than silently adopting or overwriting it. No live Supabase database was available from this workspace, so inspect for existing objects before applying these migrations.

### Preflight for existing objects

In the Supabase SQL Editor, check whether any target tables already exist:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'user_settings', 'plans', 'subscriptions',
    'posts', 'followers', 'notifications', 'saved_insights'
  )
order by table_name;
```

If any rows are returned, stop and review their definitions and data before proceeding. Do not drop or replace them. The migration scripts have not been tested against the live `economiclab` project.

Also check for conflicting helper functions and RLS policies before applying the security migrations:

```sql
select n.nspname as schema_name, p.proname as function_name
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_updated_at', 'create_profile_for_new_auth_user', 'can_read_profile');

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname in (
    'Profiles are visible to their owner or allowed audience',
    'Users can update their own profile',
    'Users can read their own settings',
    'Users can update their own settings',
    'Plans are readable by visitors and signed-in users',
    'Users can read only their own subscriptions',
    'Users can read public posts, followed posts, and their own',
    'Users can create their own posts',
    'Users can update their own posts',
    'Users can delete their own posts',
    'Users can read follower relationships they participate in',
    'Users can follow other profiles',
    'Users can unfollow profiles',
    'Users can read their own notifications',
    'Users can mark their own notifications as read',
    'Users can manage their own saved insights'
  );
```

If these queries return objects, inspect them and reconcile the migration before applying it.

### Apply with the Supabase SQL Editor

1. Back up the project and run the preflight query above.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run each migration file in timestamp order, one file at a time. Stop if any statement errors; investigate before continuing.
4. Confirm the eight tables exist and RLS is enabled. Do not create test accounts or seed records in production.

If you later switch to Supabase CLI migrations, record SQL Editor-applied versions in the CLI migration history before running `supabase db push`; otherwise the CLI may try to execute them again. With the project linked, mark each successfully applied file as applied (repeat for every version):

```powershell
supabase migration repair --status applied 20261110000001
supabase migration repair --status applied 20261110000002
supabase migration repair --status applied 20261110000003
supabase migration repair --status applied 20261110000004
```

### Apply with Supabase CLI

Install the Supabase CLI, then obtain the **project reference ID** from **Project Settings → General**. The project display name `economiclab` is not necessarily the project reference.

```powershell
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push --dry-run
supabase db push
```

Review the dry-run output and ensure the remote schema has no conflicting objects before applying. These migrations do not drop existing tables, but the first migration intentionally stops if a requested table name is already present. Do not run both the CLI and SQL Editor paths against the same migration history without reconciling migration records.

## Schema and access rules

| Table | Relationship and access |
|---|---|
| `profiles` | One row per `auth.users.id`, created by an Auth insert trigger and idempotently backfilled from existing Auth users. Owners can update their profile; profile reads follow public/follower/private visibility. Username is unique, lowercase, and validated. |
| `user_settings` | One row per profile. Only its owner can read or update it; default profile visibility is private. |
| `plans` | Publicly readable by visitors and signed-in users. Client roles cannot create or change plans. |
| `subscriptions` | Belongs to a profile and plan. Owners can read their own subscription; client roles cannot assign subscriptions or change status. Trusted server-side processes must manage billing and subscription writes. |
| `posts` | Owners can create, edit, and delete their posts. Reads are limited to the owner, public posts, and posts shared with followers. |
| `followers` | Authenticated users can follow/unfollow other profiles, but not themselves; reads are limited to relationships involving the current user. |
| `notifications` | Owners can read notifications and change only `is_read`; inserts are reserved for trusted processes. |
| `saved_insights` | Owners can create, read, update, and delete their own saved insights. Duplicate URLs per user are rejected. |

RLS is enabled on all eight tables. Database grants also restrict writable columns and operations; subscription status, plans, notification creation, and other trusted writes must use a server-side process. Keep RLS enabled for any future user data.

## Auth and application behavior

- Supabase Auth creates a profile and private default settings row in the same database transaction as a new Auth user. Inserts are idempotent on the user ID.
- With email confirmation enabled, registration asks the user to confirm their email; the callback sends them to profile onboarding. If Supabase returns a session immediately, registration proceeds directly to onboarding.
- Onboarding collects a unique username and full name. Users can later edit their profile from **Your profile** in the dashboard.
- After authentication, the app loads the user's profile and latest subscription. A missing/incomplete profile is sent to onboarding. Database errors are shown with a retry action rather than treated as a successful connection.
- Supabase Auth session refresh/logout events update protected routes; signed-out or expired sessions are sent back to login.
- The client uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. No service-role key, demo users, or seed records are included.

In **Authentication → URL Configuration**, set the Site URL to `https://app.economiclab.co.za` and allow `https://app.economiclab.co.za/auth/callback`. Add `http://localhost:5173/auth/callback` for local development.

## Netlify

The existing deployment configuration is unchanged. Set these Netlify environment variables and redeploy after adding or changing them:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key

`netlify.toml` continues to define the Vite build (`npm run build`), `dist` publish directory, Netlify Functions directory, Node 20, and SPA fallback routing.

## Verification status

This repository can validate the application build and static code, but this workspace has no configured Supabase project credentials or link. Registration, email delivery/confirmation, live profile CRUD, and database RLS behavior have **not** been exercised against `economiclab`. After applying the migrations, verify those flows with authorized test accounts in a non-production project or with accounts you explicitly provide. Never use a service-role key in the browser.

After applying the migrations, test with two authorized accounts: sign up and confirm email for one, complete onboarding, sign in/out, and edit its profile; verify the second account cannot read a private profile or update/delete the first account's rows. Confirm `plans` are readable without signing in, subscriptions are visible only to their owner, and authenticated client writes to `subscriptions` fail. Try following another user, unfollowing, and following yourself (which must fail). Test that a signed-out/expired session is redirected to login. Use a non-production project for these checks where possible; this repository does not create test accounts or fake records.
