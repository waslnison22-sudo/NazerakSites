-- Separate anonymous post read from authenticated moderator visibility checks.
begin;

drop policy if exists "forum_posts_public_read" on public.forum_posts;
drop policy if exists "forum_posts_moderator_read" on public.forum_posts;

create policy "forum_posts_public_read"
on public.forum_posts
for select
to anon
using (not is_hidden);

create policy "forum_posts_authenticated_read"
on public.forum_posts
for select
to authenticated
using ((not is_hidden) or (select private.has_forum_permission('moderate_forum')));

commit;
