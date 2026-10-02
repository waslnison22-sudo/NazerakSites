-- Applied after forum topic public author cache.
begin;

grant select (
  id,slug,category_id,
  author_public_id,author_display_name,author_avatar_url,
  author_role_slug,author_role_name,author_role_badge,
  title,body,is_pinned,is_locked,is_archived,prefix,views_count,solution_state,
  created_at,updated_at,last_post_at
) on public.forum_topics to anon,authenticated;

drop view if exists public.forum_author_directory;
create view public.forum_author_directory with (security_invoker=true) as
select
  a.public_id,a.display_name,a.avatar_url,a.bio,a.minecraft_username,
  a.joined_at,a.last_seen_at,
  (select count(*)::integer from public.forum_topics t where t.author_id=a.id) topic_count,
  (select count(*)::integer from public.forum_posts p where p.author_id=a.id and not p.is_hidden) post_count,
  a.role_slugs,a.primary_role_slug,a.primary_role_name,a.primary_role_color,a.primary_role_badge
from public.forum_authors a;

revoke all on public.forum_author_directory from anon,authenticated;
grant select on public.forum_author_directory to anon,authenticated;

drop view if exists public.forum_topic_list;
create view public.forum_topic_list with (security_invoker=true) as
select
  t.id,t.slug,t.category_id,c.slug category_slug,c.name category_name,
  t.author_public_id,t.author_display_name author_name,t.author_avatar_url,
  t.author_role_slug primary_role_slug,t.author_role_name primary_role_name,t.author_role_badge primary_role_badge,
  t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
  t.created_at,t.updated_at,t.last_post_at,
  (select count(*)::integer from public.forum_posts p where p.topic_id=t.id and not p.is_hidden) reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id;

drop view if exists public.forum_topic_detail;
create view public.forum_topic_detail with (security_invoker=true) as
select
  t.id,t.slug,t.category_id,c.slug category_slug,c.name category_name,
  t.author_public_id,t.author_display_name author_name,t.author_avatar_url,
  t.author_role_slug primary_role_slug,t.author_role_name primary_role_name,t.author_role_badge primary_role_badge,
  t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
  t.created_at,t.updated_at,t.last_post_at,
  (select count(*)::integer from public.forum_posts p where p.topic_id=t.id and not p.is_hidden) reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id;

revoke all on public.forum_topic_list,public.forum_topic_detail from anon,authenticated;
grant select on public.forum_topic_list,public.forum_topic_detail to anon,authenticated;

commit;
