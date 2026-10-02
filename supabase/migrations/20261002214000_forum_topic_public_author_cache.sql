-- Applied after forum public identifier hardening.
begin;

alter table public.forum_topics
  add column if not exists author_public_id uuid,
  add column if not exists author_display_name text,
  add column if not exists author_avatar_url text,
  add column if not exists author_role_slug text not null default 'player',
  add column if not exists author_role_name text not null default 'Игрок',
  add column if not exists author_role_badge text not null default '•';

update public.forum_topics t
set author_public_id=a.public_id,
    author_display_name=a.display_name,
    author_avatar_url=a.avatar_url,
    author_role_slug=a.primary_role_slug,
    author_role_name=a.primary_role_name,
    author_role_badge=a.primary_role_badge
from public.forum_authors a
where a.id=t.author_id;

create or replace function private.cache_forum_topic_author()
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

drop trigger if exists forum_topic_author_cache on public.forum_topics;
create trigger forum_topic_author_cache before insert on public.forum_topics
for each row execute function private.cache_forum_topic_author();

drop view if exists public.forum_topic_list;
create view public.forum_topic_list with (security_invoker=true) as
select t.id,t.slug,t.category_id,c.slug category_slug,c.name category_name,
t.author_public_id,t.author_display_name author_name,t.author_avatar_url,
t.author_role_slug primary_role_slug,t.author_role_name primary_role_name,t.author_role_badge primary_role_badge,
t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
t.created_at,t.updated_at,t.last_post_at,
(select count(*)::integer from public.forum_posts p where p.topic_id=t.id and not p.is_hidden) reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id;

drop view if exists public.forum_topic_detail;
create view public.forum_topic_detail with (security_invoker=true) as
select t.id,t.slug,t.category_id,c.slug category_slug,c.name category_name,
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
