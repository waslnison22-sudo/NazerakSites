-- Return only the authenticated caller's opaque public forum ID through a controlled RPC.
-- This migration does not change the existing table/view grants; review those separately
-- before claiming that direct reads of author identifiers are restricted.
begin;

create or replace function private.forum_my_public_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  public_id uuid;
begin
  caller_id := (select auth.uid());
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select a.public_id
    into public_id
    from public.forum_authors as a
   where a.id = caller_id;

  return public_id;
end;
$$;

revoke all on function private.forum_my_public_id() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.forum_my_public_id() to authenticated;

create or replace function public.forum_my_public_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select private.forum_my_public_id();
$$;

revoke all on function public.forum_my_public_id() from public, anon;
grant execute on function public.forum_my_public_id() to authenticated;

commit;
