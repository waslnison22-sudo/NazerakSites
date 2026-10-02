-- Rebuild public topic views to expose the category world without exposing internal author ids.
begin;

drop view if exists public.forum_topic_list;
create view public.forum_topic_list with (security_invoker=true) as
select
  t.id,t.slug,t.category_id,
  c.slug category_slug,c.name category_name,c.area_slug,
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
  t.id,t.slug,t.category_id,
  c.slug category_slug,c.name category_name,c.area_slug,
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