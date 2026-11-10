create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120)
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_auth_user()
  from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_auth_user();

insert into public.profiles (id, full_name)
select
  auth_user.id,
  left(btrim(coalesce(auth_user.raw_user_meta_data ->> 'full_name', '')), 120)
from auth.users as auth_user
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select profile.id
from public.profiles as profile
on conflict (user_id) do nothing;

create function public.can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_settings as settings
    where settings.user_id = target_user_id
      and settings.profile_visibility = 'public'
  ) or exists (
    select 1
    from public.user_settings as settings
    join public.followers as relation
      on relation.following_id = settings.user_id
    where settings.user_id = target_user_id
      and settings.profile_visibility = 'followers'
      and relation.follower_id = (select auth.uid())
  );
$$;

revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;

create policy "Profiles are visible to their owner or allowed audience"
on public.profiles
for select
to anon, authenticated
using (
  id = (select auth.uid())
  or (select public.can_read_profile(id))
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users can read their own settings"
on public.user_settings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can update their own settings"
on public.user_settings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on table public.profiles, public.user_settings from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, biography, location, website)
  on table public.profiles to authenticated;
grant select on table public.user_settings to authenticated;
grant update (theme_preference, email_notifications, profile_visibility)
  on table public.user_settings to authenticated;
