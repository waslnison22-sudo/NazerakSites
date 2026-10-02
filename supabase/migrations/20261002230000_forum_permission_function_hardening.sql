-- Restrict forum permission checks to the authenticated caller's own identity.
begin;

create or replace function private.has_forum_permission_current(p_permission text)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth as $$
  select exists(
    select 1 from public.forum_user_roles ur
    join public.forum_roles r on r.slug=ur.role_slug
    where ur.user_id=auth.uid() and p_permission=any(r.permissions)
  )
  or exists(
    select 1 from private.forum_discord_role_bindings b
    join public.forum_roles r on r.slug=b.role_slug
    where b.discord_user_id=private.discord_provider_id_for_user(auth.uid())
      and p_permission=any(r.permissions)
  );
$$;

revoke all on function private.has_forum_permission_current(text) from public,anon;
grant execute on function private.has_forum_permission_current(text) to authenticated;
grant usage on schema private to authenticated;

drop policy if exists "forum_user_roles_internal_read" on public.forum_user_roles;
create policy "forum_user_roles_internal_read" on public.forum_user_roles for select to authenticated
using ((select private.has_forum_permission_current('manage_roles')));

drop policy if exists "forum_topics_update" on public.forum_topics;
create policy "forum_topics_update" on public.forum_topics for update to authenticated
using (((select auth.uid())=author_id) or (select private.has_forum_permission_current('moderate_forum')))
with check (((select auth.uid())=author_id) or (select private.has_forum_permission_current('moderate_forum')));

drop policy if exists "forum_topics_delete" on public.forum_topics;
create policy "forum_topics_delete" on public.forum_topics for delete to authenticated
using (((select auth.uid())=author_id) or (select private.has_forum_permission_current('moderate_forum')));

drop policy if exists "forum_posts_update" on public.forum_posts;
create policy "forum_posts_update" on public.forum_posts for update to authenticated
using (((select auth.uid())=author_id) or (select private.has_forum_permission_current('moderate_forum')))
with check (((select auth.uid())=author_id) or (select private.has_forum_permission_current('moderate_forum')));

drop policy if exists "forum_posts_delete" on public.forum_posts;
create policy "forum_posts_delete" on public.forum_posts for delete to authenticated
using (((select auth.uid())=author_id) or (select private.has_forum_permission_current('moderate_forum')));

drop policy if exists "forum_posts_authenticated_read" on public.forum_posts;
create policy "forum_posts_authenticated_read" on public.forum_posts for select to authenticated
using ((not is_hidden) or (select private.has_forum_permission_current('moderate_forum')));

revoke all on function private.discord_provider_id_for_user(uuid) from public,anon,authenticated;

drop function private.has_forum_permission(text,uuid);
alter function private.has_forum_permission_current(text) rename to has_forum_permission;

commit;
