-- NaZerak forum moderation RPCs.
-- State changes (pin/lock/archive) are deliberately exposed through a
-- permission-checked SECURITY DEFINER function instead of broad column UPDATE grants.
begin;

create or replace function public.forum_moderate_topic(
  p_topic_id bigint,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  if not private.has_forum_permission('moderate_forum') then
    raise exception 'forbidden';
  end if;

  if p_action not in ('pin','unpin','lock','unlock','archive','unarchive') then
    raise exception 'invalid_action';
  end if;

  update public.forum_topics
  set
    is_pinned = case when p_action = 'pin' then true when p_action = 'unpin' then false else is_pinned end,
    is_locked = case when p_action = 'lock' then true when p_action = 'unlock' then false else is_locked end,
    is_archived = case when p_action = 'archive' then true when p_action = 'unarchive' then false else is_archived end,
    updated_at = now()
  where id = p_topic_id;

  return found;
end;
$$;

revoke all on function public.forum_moderate_topic(bigint, text) from public, anon;
grant execute on function public.forum_moderate_topic(bigint, text) to authenticated;

commit;
