-- Applied after forum structure and role migrations.
begin;

alter table public.forum_posts
  add column if not exists author_public_id uuid,
  add column if not exists author_display_name text,
  add column if not exists author_avatar_url text,
  add column if not exists author_role_slug text not null default 'player',
  add column if not exists author_role_name text not null default 'Игрок',
  add column if not exists author_role_badge text not null default '•';

update public.forum_posts p
set author_public_id=a.public_id,
    author_display_name=a.display_name,
    author_avatar_url=a.avatar_url,
    author_role_slug=a.primary_role_slug,
    author_role_name=a.primary_role_name,
    author_role_badge=a.primary_role_badge
from public.forum_authors a
where a.id=p.author_id;

create or replace function private.cache_forum_post_author()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare a public.forum_authors%rowtype;
begin
  select * into a from public.forum_authors where id=new.author_id;
  if a.id is not null then
    new.author_public_id=a.public_id;
    new.author_display_name=a.display_name;
    new.author_avatar_url=a.avatar_url;
    new.author_role_slug=a.primary_role_slug;
    new.author_role_name=a.primary_role_name;
    new.author_role_badge=a.primary_role_badge;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_post_author_cache on public.forum_posts;
create trigger forum_post_author_cache
before insert on public.forum_posts
for each row execute function private.cache_forum_post_author();

drop policy if exists "forum_posts_public_read" on public.forum_posts;
create policy "forum_posts_public_read"
on public.forum_posts for select
to anon,authenticated
using (not is_hidden or (select private.has_forum_permission('moderate_forum')));

revoke all on public.forum_posts from anon,authenticated;
grant select (id,topic_id,body,created_at,updated_at,edited_at,author_public_id,author_display_name,author_avatar_url,author_role_slug,author_role_name,author_role_badge)
on public.forum_posts to anon,authenticated;
grant insert (topic_id,author_id,body) on public.forum_posts to authenticated;
grant update (body,updated_at,edited_at) on public.forum_posts to authenticated;
grant delete on public.forum_posts to authenticated;

drop view if exists public.forum_topic_list;
create view public.forum_topic_list
with (security_invoker=true)
as
select
  t.id,t.slug,t.category_id,c.slug category_slug,c.name category_name,
  a.public_id author_public_id,coalesce(a.display_name,'Игрок NaZerak') author_name,
  a.avatar_url author_avatar_url,
  coalesce(a.primary_role_slug,'player') primary_role_slug,
  coalesce(a.primary_role_name,'Игрок') primary_role_name,
  coalesce(a.primary_role_badge,'•') primary_role_badge,
  t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
  t.created_at,t.updated_at,t.last_post_at,
  (select count(*)::integer from public.forum_posts p where p.topic_id=t.id and not p.is_hidden) reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id
left join public.forum_authors a on a.id=t.author_id;

revoke all on public.forum_topics from anon,authenticated;
grant select (id) on public.forum_topics to authenticated;
grant insert (category_id,author_id,title,body,slug,prefix) on public.forum_topics to authenticated;
grant update (title,body,updated_at) on public.forum_topics to authenticated;
grant delete on public.forum_topics to authenticated;

drop view if exists public.forum_topic_detail;
create view public.forum_topic_detail
with (security_invoker=true)
as
select
  t.id,t.slug,t.category_id,c.slug category_slug,c.name category_name,
  a.public_id author_public_id,coalesce(a.display_name,'Игрок NaZerak') author_name,
  a.avatar_url author_avatar_url,
  coalesce(a.primary_role_slug,'player') primary_role_slug,
  coalesce(a.primary_role_name,'Игрок') primary_role_name,
  coalesce(a.primary_role_badge,'•') primary_role_badge,
  t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
  t.created_at,t.updated_at,t.last_post_at,
  (select count(*)::integer from public.forum_posts p where p.topic_id=t.id and not p.is_hidden) reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id
left join public.forum_authors a on a.id=t.author_id;

revoke all on public.forum_topic_list,public.forum_topic_detail from anon,authenticated;
grant select on public.forum_topic_list,public.forum_topic_detail to anon,authenticated;

commit;
