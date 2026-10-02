-- Public forum counters and views no longer require internal author UUID access.
begin;

alter table public.forum_authors
  add column if not exists topic_count integer not null default 0,
  add column if not exists post_count integer not null default 0;

alter table public.forum_topics
  add column if not exists reply_count integer not null default 0;

create or replace function private.recount_forum_author(p_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  update public.forum_authors a
  set topic_count=(select count(*)::integer from public.forum_topics t where t.author_id=p_user_id),
      post_count=(select count(*)::integer from public.forum_posts p where p.author_id=p_user_id and not p.is_hidden)
  where a.id=p_user_id;
end;
$$;
revoke all on function private.recount_forum_author(uuid) from public,anon,authenticated;

create or replace function private.recount_forum_topic_replies(p_topic_id bigint)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  update public.forum_topics t
  set reply_count=(select count(*)::integer from public.forum_posts p where p.topic_id=p_topic_id and not p.is_hidden)
  where t.id=p_topic_id;
end;
$$;
revoke all on function private.recount_forum_topic_replies(bigint) from public,anon,authenticated;

create or replace function private.sync_forum_author_counters()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='INSERT' then
    if not new.is_hidden then update public.forum_authors set post_count=post_count+1 where id=new.author_id; end if;
    if not new.is_hidden then update public.forum_topics set reply_count=reply_count+1 where id=new.topic_id; end if;
    return new;
  elsif tg_op='DELETE' then
    if not old.is_hidden then update public.forum_authors set post_count=greatest(0,post_count-1) where id=old.author_id; end if;
    if not old.is_hidden then update public.forum_topics set reply_count=greatest(0,reply_count-1) where id=old.topic_id; end if;
    return old;
  else
    if new.author_id<>old.author_id or new.is_hidden<>old.is_hidden then
      if not old.is_hidden then update public.forum_authors set post_count=greatest(0,post_count-1) where id=old.author_id; end if;
      if not new.is_hidden then update public.forum_authors set post_count=post_count+1 where id=new.author_id; end if;
      if new.topic_id<>old.topic_id then
        if not old.is_hidden then update public.forum_topics set reply_count=greatest(0,reply_count-1) where id=old.topic_id; end if;
        if not new.is_hidden then update public.forum_topics set reply_count=reply_count+1 where id=new.topic_id; end if;
      elsif new.is_hidden<>old.is_hidden then
        if old.is_hidden then update public.forum_topics set reply_count=reply_count+1 where id=old.topic_id; else update public.forum_topics set reply_count=greatest(0,reply_count-1) where id=old.topic_id; end if;
      end if;
    end if;
    return new;
  end if;
end;
$$;
revoke all on function private.sync_forum_author_counters() from public,anon,authenticated;

create or replace function private.sync_forum_author_topic_counter()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='INSERT' then
    update public.forum_authors set topic_count=topic_count+1 where id=new.author_id;
  elsif tg_op='DELETE' then
    update public.forum_authors set topic_count=greatest(0,topic_count-1) where id=old.author_id;
  elsif new.author_id<>old.author_id then
    update public.forum_authors set topic_count=greatest(0,topic_count-1) where id=old.author_id;
    update public.forum_authors set topic_count=topic_count+1 where id=new.author_id;
  end if;
  return coalesce(new,old);
end;
$$;
revoke all on function private.sync_forum_author_topic_counter() from public,anon,authenticated;

drop trigger if exists forum_post_counter_sync on public.forum_posts;
create trigger forum_post_counter_sync after insert or update or delete on public.forum_posts
for each row execute function private.sync_forum_author_counters();

drop trigger if exists forum_topic_author_counter_sync on public.forum_topics;
create trigger forum_topic_author_counter_sync after insert or update or delete on public.forum_topics
for each row execute function private.sync_forum_author_topic_counter();

update public.forum_authors a
set topic_count=(select count(*)::integer from public.forum_topics t where t.author_id=a.id),
    post_count=(select count(*)::integer from public.forum_posts p where p.author_id=a.id and not p.is_hidden);

update public.forum_topics t
set reply_count=(select count(*)::integer from public.forum_posts p where p.topic_id=t.id and not p.is_hidden);

revoke all on table public.forum_authors from anon,authenticated;
grant select (public_id,display_name,avatar_url,bio,minecraft_username,joined_at,last_seen_at,topic_count,post_count,role_slugs,primary_role_slug,primary_role_name,primary_role_color,primary_role_badge) on public.forum_authors to anon,authenticated;

revoke all on table public.forum_posts from anon,authenticated;
grant select (id,topic_id,body,created_at,updated_at,edited_at,author_public_id,author_display_name,author_avatar_url,author_role_slug,author_role_name,author_role_badge) on public.forum_posts to anon,authenticated;

grant select (id,slug,category_id,author_public_id,author_display_name,author_avatar_url,author_role_slug,author_role_name,author_role_badge,title,body,is_pinned,is_locked,is_archived,prefix,views_count,solution_state,created_at,updated_at,last_post_at,reply_count) on public.forum_topics to anon,authenticated;

commit;