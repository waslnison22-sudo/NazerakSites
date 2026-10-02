-- Prevent replies to locked or archived topics at the RLS layer.
begin;

drop policy if exists "forum_posts_insert_own" on public.forum_posts;
create policy "forum_posts_insert_own"
on public.forum_posts
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and exists (
    select 1 from public.forum_topics t
    where t.id=topic_id and not t.is_locked and not t.is_archived
  )
);

commit;
