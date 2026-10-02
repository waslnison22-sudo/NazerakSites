-- Harden the protected Discord role binding table.
begin;

create index if not exists forum_discord_role_bindings_role_slug_idx
  on private.forum_discord_role_bindings(role_slug);

drop policy if exists forum_discord_role_bindings_deny_client on private.forum_discord_role_bindings;
create policy forum_discord_role_bindings_deny_client
  on private.forum_discord_role_bindings
  for all
  to anon, authenticated
  using (false)
  with check (false);

commit;
