begin;
drop policy if exists "forum_reactions_public_read" on public.forum_post_reactions;
drop policy if exists "forum_reactions_own_read" on public.forum_post_reactions;
create policy "forum_reactions_own_read" on public.forum_post_reactions for select to authenticated using ((select auth.uid()) = user_id);
revoke select on public.forum_post_reactions from anon, authenticated;
grant select, insert, update, delete on public.forum_post_reactions to authenticated;
drop view if exists public.forum_post_reaction_summary;
create view public.forum_post_reaction_summary with (security_invoker=true) as
select post_id,reaction,count(*)::integer as reaction_count
from public.forum_post_reactions
group by post_id,reaction;
revoke all on public.forum_post_reaction_summary from anon, authenticated;
grant select on public.forum_post_reaction_summary to anon, authenticated;
commit;