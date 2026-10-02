-- Add per-category posting policy. Open sections accept community posts; official sections require publish_official.
begin;

alter table public.forum_categories
  add column if not exists posting_mode text not null default 'open';

alter table public.forum_categories
  drop constraint if exists forum_categories_posting_mode_check;

alter table public.forum_categories
  add constraint forum_categories_posting_mode_check
  check (posting_mode in ('open','official','restricted'));

update public.forum_categories
set posting_mode = case slug
  when 'announcements' then 'official'
  when 'rules' then 'official'
  when 'project' then 'official'
  when 'applications' then 'open'
  when 'help' then 'open'
  when 'appeals' then 'open'
  else 'open'
end;

drop policy if exists "forum_topics_insert_own" on public.forum_topics;
create policy "forum_topics_insert_own"
on public.forum_topics
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and exists (
    select 1 from public.forum_categories c
    where c.id=category_id
      and (
        c.posting_mode='open'
        or (c.posting_mode='official' and (select private.has_forum_permission('publish_official')))
        or (c.posting_mode='restricted' and (select private.has_forum_permission('manage_categories')))
      )
  )
);

commit;
