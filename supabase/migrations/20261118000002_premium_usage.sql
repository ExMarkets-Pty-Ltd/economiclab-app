create table public.premium_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission text not null check (char_length(permission) between 1 and 120),
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission, usage_date)
);

alter table public.premium_usage enable row level security;
revoke all on table public.premium_usage from public, anon, authenticated;

create function public.consume_premium_usage(
  p_user_id uuid,
  p_permission text,
  p_daily_limit integer
)
returns table (allowed boolean, used integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  utc_today date := (now() at time zone 'UTC')::date;
  request_total integer;
begin
  if p_user_id is null
    or p_permission is null
    or char_length(p_permission) not between 1 and 120
    or p_daily_limit is null
    or p_daily_limit < 1
  then
    raise exception 'Invalid premium usage request.';
  end if;

  insert into public.premium_usage as usage_row (
    user_id,
    permission,
    usage_date,
    request_count,
    updated_at
  )
  values (p_user_id, p_permission, utc_today, 1, now())
  on conflict (user_id, permission, usage_date)
  do update
    set request_count = usage_row.request_count + 1,
        updated_at = now()
    where usage_row.request_count < p_daily_limit
  returning request_count into request_total;

  if request_total is null then
    select counter.request_count
      into request_total
      from public.premium_usage as counter
      where counter.user_id = p_user_id
        and counter.permission = p_permission
        and counter.usage_date = utc_today;
    return query
      select false, request_total, ((utc_today + 1)::timestamp at time zone 'UTC');
  else
    return query
      select true, request_total, ((utc_today + 1)::timestamp at time zone 'UTC');
  end if;
end;
$$;

revoke all on function public.consume_premium_usage(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_premium_usage(uuid, text, integer)
  to service_role;
