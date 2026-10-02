-- Public forum community statistics.
begin;

drop view if exists public.forum_community_stats;
create view public.forum_community_stats with (security_invoker=true) as
select count(*)::integer as member_count,
       count(*) filter (where last_seen_at >= now() - interval '15 minutes')::integer as online_count
from public.forum_authors;

revoke all on public.forum_community_stats from anon,authenticated;
grant select on public.forum_community_stats to anon,authenticated;

commit;
