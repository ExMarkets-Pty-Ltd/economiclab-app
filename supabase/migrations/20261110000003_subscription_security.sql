alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

create policy "Plans are readable by visitors and signed-in users"
on public.plans
for select
to anon, authenticated
using (true);

create policy "Users can read only their own subscriptions"
on public.subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.plans, public.subscriptions from anon, authenticated;
grant select on table public.plans to anon, authenticated;
grant select on table public.subscriptions to authenticated;
