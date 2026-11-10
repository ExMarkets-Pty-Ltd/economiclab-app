alter table public.posts enable row level security;
alter table public.followers enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_insights enable row level security;

create policy "Users can read public posts, followed posts, and their own"
on public.posts
for select
to anon, authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1
      from public.followers as relation
      where relation.follower_id = (select auth.uid())
        and relation.following_id = posts.user_id
    )
  )
);

create policy "Users can create their own posts"
on public.posts
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own posts"
on public.posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete their own posts"
on public.posts
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can read follower relationships they participate in"
on public.followers
for select
to authenticated
using (
  follower_id = (select auth.uid())
  or following_id = (select auth.uid())
);

create policy "Users can follow other profiles"
on public.followers
for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and follower_id <> following_id
);

create policy "Users can unfollow profiles"
on public.followers
for delete
to authenticated
using (follower_id = (select auth.uid()));

create policy "Users can read their own notifications"
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications as read"
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can manage their own saved insights"
on public.saved_insights
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on table public.posts, public.followers, public.notifications, public.saved_insights
  from anon, authenticated;

grant select on table public.posts to anon, authenticated;
grant insert, delete on table public.posts to authenticated;
grant update (content, image_url, visibility) on table public.posts to authenticated;

grant select, insert, delete on table public.followers to authenticated;

grant select on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;

grant select, insert, delete on table public.saved_insights to authenticated;
grant update (insight_url, insight_title) on table public.saved_insights to authenticated;
