alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists provider_subscription_token text,
  add column if not exists internal_reference text,
  add column if not exists billing_interval text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists next_billing_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists last_payment_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists failure_reason text,
  add column if not exists provider_synced_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  plan_id uuid not null references public.plans (id) on delete restrict,
  internal_reference text not null,
  provider_payment_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  status text not null check (status in ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  payment_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete set null,
  provider_reference text,
  event_type text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'accepted', 'ignored', 'rejected', 'failed')),
  verification_result text,
  processed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  permission text not null check (char_length(permission) between 1 and 120),
  expires_at timestamptz,
  source text not null default 'plan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_entitlements_unique
    unique (user_id, subscription_id, permission)
);

alter table public.subscriptions
  add constraint subscriptions_internal_reference_unique
  unique (internal_reference);

alter table public.payments
  add constraint payments_internal_reference_unique
  unique (internal_reference);

create unique index if not exists payments_provider_payment_id_unique
  on public.payments (provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists payment_events_provider_reference_event_unique
  on public.payment_events (provider_reference, event_type)
  where provider_reference is not null;

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

create index if not exists subscription_entitlements_lookup_idx
  on public.subscription_entitlements (user_id, permission, expires_at);

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.subscription_entitlements enable row level security;

create policy "Users can read their own payments"
on public.payments
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can read their own entitlements"
on public.subscription_entitlements
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.subscriptions, public.payments,
  public.payment_events, public.subscription_entitlements
  from anon, authenticated;

grant select on table public.subscriptions to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.subscription_entitlements to authenticated;
