-- NaZerak forum structure: two worlds, no seeded discussions, Discord-ID-backed administrator.
begin;

alter table public.forum_categories
  add column if not exists area_slug text not null default 'rp';

alter table public.forum_categories
  drop constraint if exists forum_categories_area_slug_check;

alter table public.forum_categories
  add constraint forum_categories_area_slug_check
  check (area_slug in ('rp','administration'));

create index if not exists forum_categories_area_sort_idx
  on public.forum_categories(area_slug, sort_order, id);

update public.forum_categories
set area_slug = case slug
  when 'announcements' then 'administration'
  when 'rules' then 'administration'
  when 'project' then 'administration'
  else 'rp'
end;

update public.forum_categories
set name = case slug
  when 'announcements' then 'Новости проекта'
  when 'rules' then 'Законы и правила'
  when 'project' then 'Проект и документация'
  when 'minecraft' then 'Игровой мир'
  when 'government' then 'Государство и организации'
  when 'help' then 'Техническая поддержка'
  when 'ideas' then 'Предложения и развитие'
  when 'appeals' then 'Обращения и жалобы'
  when 'off-topic' then 'Свободное общение'
  else name
end,
description = case slug
  when 'announcements' then 'Официальные публикации проекта, обновления и важные объявления.'
  when 'rules' then 'Публичные законы, правила, регламенты и обязательные документы.'
  when 'project' then 'Документация проекта, устройство мира и материалы для администрации.'
  when 'minecraft' then 'РП-мир, события, строительство и повседневная жизнь игроков.'
  when 'government' then 'Государственные органы, организации и взаимодействие между ними.'
  when 'help' then 'Технические вопросы по игре, сайту и подключению.'
  when 'ideas' then 'Предложения по игровому миру, механикам и развитию NaZerak.'
  when 'appeals' then 'Жалобы, обращения и иные официальные запросы.'
  when 'off-topic' then 'Общение сообщества вне основных игровых разделов.'
  else description
end;

-- These were temporary starter discussions, not user-created content.
-- Keep the schema and categories, but start the real forum with no authored topics.
delete from public.forum_topics;

create table if not exists private.forum_discord_role_bindings (
  discord_user_id text primary key,
  role_slug text not null references public.forum_roles(slug) on delete restrict,
  assigned_at timestamptz not null default now(),
  constraint forum_discord_role_bindings_id_format
    check (discord_user_id ~ '^[0-9]{15,21}$')
);

alter table private.forum_discord_role_bindings enable row level security;
revoke all on table private.forum_discord_role_bindings from public, anon, authenticated;

create or replace function private.discord_provider_id_for_user(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path=pg_catalog,auth
as $$
  select i.provider_id
  from auth.identities i
  where i.user_id=p_user_id
    and i.provider='discord'
  order by i.created_at
  limit 1;
$$;

revoke all on function private.discord_provider_id_for_user(uuid) from public, anon, authenticated;
grant execute on function private.discord_provider_id_for_user(uuid) to authenticated;

create or replace function private.has_forum_permission(p_permission text,p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
  select
    exists(
      select 1
      from public.forum_user_roles ur
      join public.forum_roles r on r.slug=ur.role_slug
      where ur.user_id=p_user_id
        and p_permission=any(r.permissions)
    )
    or exists(
      select 1
      from private.forum_discord_role_bindings b
      join public.forum_roles r on r.slug=b.role_slug
      where b.discord_user_id=private.discord_provider_id_for_user(p_user_id)
        and p_permission=any(r.permissions)
    );
$$;

revoke all on function private.has_forum_permission(text,uuid) from public, anon;
grant execute on function private.has_forum_permission(text,uuid) to authenticated;

create or replace function private.assign_default_forum_role()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_discord_id text;
  v_role_slug text;
begin
  select i.provider_id into v_discord_id
  from auth.identities i
  where i.user_id=new.id and i.provider='discord'
  order by i.created_at
  limit 1;

  select b.role_slug into v_role_slug
  from private.forum_discord_role_bindings b
  where b.discord_user_id=v_discord_id
  limit 1;

  insert into public.forum_user_roles(user_id,role_slug)
  values(new.id,coalesce(v_role_slug,'player'))
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.assign_default_forum_role() from public, anon, authenticated;

do $$
declare
  v_user_id uuid;
begin
  select i.user_id into v_user_id
  from auth.identities i
  where i.provider='discord'
    and i.provider_id='1129741865646837812'
  order by i.created_at
  limit 1;

  insert into private.forum_discord_role_bindings(discord_user_id,role_slug)
  values('1129741865646837812','administrator')
  on conflict (discord_user_id) do update
    set role_slug=excluded.role_slug;

  if v_user_id is not null then
    insert into public.forum_user_roles(user_id,role_slug,assigned_by)
    values(v_user_id,'administrator',v_user_id)
    on conflict(user_id,role_slug) do nothing;

    perform private.sync_forum_author_roles(v_user_id);
  end if;
end $$;

comment on table private.forum_discord_role_bindings is
  'Non-exposed protected Discord identity bindings for privileged NaZerak forum roles.';

comment on column public.forum_categories.area_slug is
  'Top-level forum world: rp or administration.';

commit;
