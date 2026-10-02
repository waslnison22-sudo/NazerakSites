-- Applied after forum public security hardening.
begin;
alter table public.forum_roles enable row level security;
alter table public.forum_user_roles enable row level security;
drop policy if exists "forum_roles_public_read" on public.forum_roles;
create policy "forum_roles_public_read" on public.forum_roles for select to anon,authenticated using (true);
drop policy if exists "forum_user_roles_internal_read" on public.forum_user_roles;
create policy "forum_user_roles_internal_read" on public.forum_user_roles for select to authenticated using ((select private.has_forum_permission('manage_roles')));
revoke all on public.forum_user_roles from anon,authenticated;
revoke all on public.forum_roles from anon,authenticated;
grant select on public.forum_roles to anon,authenticated;
commit;
