# EconomicLab App

The separate authenticated EconomicLab application, built with React, Vite, Supabase, and Netlify. It is intended for `app.economiclab.co.za`; it does not change the EconomicLab public website.

## Requirements

- Node.js 20 or newer
- A Supabase project
- A Netlify site connected to this repository

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and enter the Supabase project URL and **anon/public** key.
3. Start the development server with `npm run dev`.

The app's authentication pages remain accessible without credentials, but sign-in and registration require Supabase configuration. Never put a Supabase `service_role` key in a `VITE_` variable or in this repository.

## Supabase setup

In the Supabase dashboard:

1. Open **Project Settings → API** and copy the Project URL and `anon`/publishable key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Under **Authentication → URL Configuration**, set the Site URL to `https://app.economiclab.co.za`.
3. Add `https://app.economiclab.co.za/auth/callback` to the allowed Redirect URLs. Add `http://localhost:5173/auth/callback` for local development.
4. Configure email confirmation and password policies to suit your organization. User signup is handled by Supabase; this project does not create seed users or database records.

Keep Supabase Row Level Security enabled for any tables added in the future. The browser client uses only the public anon key; authorization for application data must be enforced by RLS.

## Netlify deployment

1. Import this repository into Netlify and set the production branch to `main`.
2. In **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key
3. Use the build command `npm run build` and publish directory `dist`. `netlify.toml` already defines these values and the `functions` directory.
4. Deploy the site, then go to **Domain management → Domains** and add `app.economiclab.co.za`. Configure the DNS record Netlify provides at your DNS host and enable HTTPS in Netlify.
5. Update the Supabase Site URL and allowed callback URL as above, using the deployed domain.

Netlify serves the SPA routes through the redirect in `netlify.toml`. A non-sensitive health endpoint is available at `/.netlify/functions/health`.

## Project structure

```text
functions/            Netlify Functions
src/
  components/         Shared layout and protected-route components
  context/            Supabase authentication state
  lib/                Supabase client configuration
  pages/              Login, registration, callback, and dashboard
  App.jsx             Routes
  main.jsx            Application entry point
  styles.css          Responsive application styles
```
