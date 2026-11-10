create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_url text,
  biography text check (char_length(biography) <= 2000),
  location text check (char_length(location) <= 120),
  website text check (char_length(website) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or (
      username = lower(username)
      and username ~ '^[a-z0-9_]{3,32}$'
    )
  )
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme_preference text not null default 'system'
    check (theme_preference in ('light', 'dark', 'system')),
  email_notifications boolean not null default true,
  profile_visibility text not null default 'private'
    check (profile_visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 120),
  description text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  billing_interval text not null
    check (billing_interval in ('month', 'year', 'one_time')),
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null default 'incomplete'
    check (status in ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  image_url text,
  visibility text not null default 'private'
    check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.followers (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint followers_no_self_follow check (follower_id <> following_id),
  constraint followers_unique_pair unique (follower_id, following_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (char_length(type) between 1 and 80),
  title text not null check (char_length(title) between 1 and 200),
  message text not null default '' check (char_length(message) <= 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.saved_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  insight_url text not null check (char_length(insight_url) between 1 and 2048),
  insight_title text not null check (char_length(insight_title) between 1 and 300),
  created_at timestamptz not null default now(),
  constraint saved_insights_unique_url unique (user_id, insight_url)
);

create index subscriptions_user_started_idx
  on public.subscriptions (user_id, started_at desc);
create index posts_user_created_idx
  on public.posts (user_id, created_at desc);
create index posts_visibility_created_idx
  on public.posts (visibility, created_at desc);
create index followers_following_idx
  on public.followers (following_id, follower_id);
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index saved_insights_user_created_idx
  on public.saved_insights (user_id, created_at desc);
