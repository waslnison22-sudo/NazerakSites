-- Keep public forum node directory independent from hidden post columns.
begin;
drop view if exists public.forum_node_directory;
create view public.forum_node_directory with (security_invoker=true) as
select
  c.id,c.slug,c.name,c.description,c.sort_order,c.icon,c.accent_color,
  c.area_slug,c.posting_mode,c.node_type,c.parent_id,c.route_slug,
  p.slug parent_slug,p.name parent_name,
  (select count(*)::integer from public.forum_topics t where t.category_id=c.id) topic_count,
  (select coalesce(sum(1+coalesce(t.reply_count,0)),0)::integer
     from public.forum_topics t where t.category_id=c.id) post_count
from public.forum_categories c
left join public.forum_categories p on p.id=c.parent_id;
revoke all on public.forum_node_directory from anon,authenticated;
grant select on public.forum_node_directory to anon,authenticated;
commit;
