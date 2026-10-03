-- Forum runtime integrity: browser author sync + last activity maintenance.
begin;

grant insert (id, display_name, avatar_url, updated_at, last_seen_at)
  on table public.forum_authors to authenticated;
grant update (display_name, avatar_url, updated_at, last_seen_at)
  on table public.forum_authors to authenticated;

create or replace function private.touch_forum_topic_last_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic_id bigint;
  v_last_post_at timestamptz;
begin
  if tg_op = 'DELETE' then
    v_topic_id := old.topic_id;
  else
    v_topic_id := new.topic_id;
  end if;

  select greatest(
    t.created_at,
    coalesce(max(p.created_at) filter (where not p.is_hidden), t.created_at)
  )
  into v_last_post_at
  from public.forum_topics t
  left join public.forum_posts p on p.topic_id = t.id
  where t.id = v_topic_id
  group by t.id, t.created_at;

  update public.forum_topics
  set last_post_at = v_last_post_at,
      updated_at = greatest(updated_at, coalesce(v_last_post_at, updated_at))
  where id = v_topic_id;

  if tg_op = 'UPDATE' and old.topic_id is distinct from new.topic_id then
    update public.forum_topics t
    set last_post_at = greatest(
      t.created_at,
      coalesce(
        (select max(p.created_at) from public.forum_posts p where p.topic_id = t.id and not p.is_hidden),
        t.created_at
      )
    )
    where t.id = old.topic_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists forum_topic_last_post_touch on public.forum_posts;
create trigger forum_topic_last_post_touch
after insert or update or delete on public.forum_posts
for each row
execute function private.touch_forum_topic_last_post();

revoke all on function private.touch_forum_topic_last_post() from public, anon, authenticated;

update public.forum_topics t
set last_post_at = greatest(
  t.created_at,
  coalesce(
    (select max(p.created_at) from public.forum_posts p where p.topic_id = t.id and not p.is_hidden),
    t.created_at
  )
);

commit;
