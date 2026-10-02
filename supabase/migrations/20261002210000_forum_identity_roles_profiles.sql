-- Applied foundation after 20261002200000_forum_foundation.sql.
begin;

create extension if not exists pgcrypto;

alter table public.forum_authors
  add column if not exists public_id uuid not null default gen_random_uuid(),
  add column if not exists bio text not null default '',
  add column if not exists minecraft_username text,
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz,
  add column if not exists role_slugs jsonb not null default '[]'::jsonb,
  add column if not exists primary_role_slug text not null default 'player',
  add column if not exists primary_role_name text not null default 'Игрок',
  add column if not exists primary_role_color text not null default '#a9adb7',
  add column if not exists primary_role_badge text not null default '•';

create unique index if not exists forum_authors_public_id_uidx on public.forum_authors(public_id);

create table if not exists public.forum_roles (
  slug text primary key,
  name text not null,
  short_name text not null,
  color text not null,
  badge text not null default '',
  description text not null default '',
  priority integer not null default 0,
  permissions text[] not null default '{}'
);

create table if not exists public.forum_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_slug text not null references public.forum_roles(slug) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role_slug)
);

insert into public.forum_roles(slug,name,short_name,color,badge,description,priority,permissions) values
('administrator','Администратор','ADMIN','#ff334d','★','Полное управление форумом и проектными разделами.',100,ARRAY['moderate_forum','manage_roles','manage_categories','publish_official']),
('project-management','Руководство проекта','РУКОВОДСТВО','#ff6b35','◆','Руководство и принятие проектных решений.',90,ARRAY['publish_official']),
('developer','Разработчик','DEV','#7c8cff','⌘','Разработка сайта, сервера и игровых систем.',85,ARRAY['publish_official']),
('moderator','Модератор','МОДЕРАТОР','#48d597','✓','Модерация дискуссий и порядка на форуме.',80,ARRAY['moderate_forum']),
('curator','Куратор','КУРАТОР','#9b6cff','✦','Кураторство разделов и помощь участникам.',70,ARRAY['moderate_forum']),
('governor','Губернатор','ГУБЕРНАТОР','#ffd166','◈','Глава государственного направления в игровом мире.',60,ARRAY[]::text[]),
('government','Правительство','ПРАВИТЕЛЬСТВО','#f2c94c','◆','Официальное игровое государственное направление.',50,ARRAY[]::text[]),
('court','Суд','СУД','#c9d2df','⚖','Игровая судебная структура.',50,ARRAY[]::text[]),
('media','Медиа','МЕДИА','#ff71c8','●','Официальные медиа-представители проекта.',30,ARRAY[]::text[]),
('verified','Проверенный','ПРОВЕРЕН','#5ac8fa','✓','Подтверждённый участник сообщества.',20,ARRAY[]::text[]),
('player','Игрок','ИГРОК','#a9adb7','•','Обычный участник форума.',0,ARRAY[]::text[])
on conflict(slug) do update set name=excluded.name,short_name=excluded.short_name,color=excluded.color,badge=excluded.badge,description=excluded.description,priority=excluded.priority,permissions=excluded.permissions;

create schema if not exists private;

create or replace function private.has_forum_permission(p_permission text,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth as $$
  select exists(
    select 1
    from public.forum_user_roles ur
    join public.forum_roles r on r.slug=ur.role_slug
    where ur.user_id=p_user_id and p_permission=any(r.permissions)
  );
$$;
revoke all on function private.has_forum_permission(text,uuid) from public;
grant execute on function private.has_forum_permission(text,uuid) to authenticated;

create or replace function private.sync_forum_author_roles(p_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  rjson jsonb;
  rslug text;
  rname text;
  rcolor text;
  rbadge text;
begin
  select
    coalesce(jsonb_agg(jsonb_build_object('slug',r.slug,'name',r.name,'short_name',r.short_name,'color',r.color,'badge',r.badge,'priority',r.priority) order by r.priority desc,r.slug),'[{"slug":"player","name":"Игрок","short_name":"ИГРОК","color":"#a9adb7","badge":"•","priority":0}]'::jsonb),
    coalesce((array_agg(r.slug order by r.priority desc,r.slug))[1],'player'),
    coalesce((array_agg(r.name order by r.priority desc,r.slug))[1],'Игрок'),
    coalesce((array_agg(r.color order by r.priority desc,r.slug))[1],'#a9adb7'),
    coalesce((array_agg(r.badge order by r.priority desc,r.slug))[1],'•')
  into rjson,rslug,rname,rcolor,rbadge
  from public.forum_user_roles ur
  join public.forum_roles r on r.slug=ur.role_slug
  where ur.user_id=p_user_id;

  update public.forum_authors
  set role_slugs=rjson,primary_role_slug=rslug,primary_role_name=rname,primary_role_color=rcolor,primary_role_badge=rbadge
  where id=p_user_id;
end;
$$;
revoke all on function private.sync_forum_author_roles(uuid) from public;

create or replace function private.assign_default_forum_role()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.forum_user_roles(user_id,role_slug) values(new.id,'player') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists forum_author_default_role on public.forum_authors;
create trigger forum_author_default_role after insert on public.forum_authors
for each row execute function private.assign_default_forum_role();

create or replace function private.refresh_author_role_cache()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='DELETE' then
    update public.forum_authors
    set role_slugs='[{"slug":"player","name":"Игрок","short_name":"ИГРОК","color":"#a9adb7","badge":"•","priority":0}]'::jsonb,
        primary_role_slug='player',primary_role_name='Игрок',primary_role_color='#a9adb7',primary_role_badge='•'
    where id=old.user_id;
  else
    perform private.sync_forum_author_roles(new.user_id);
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists forum_user_roles_refresh_author on public.forum_user_roles;
create trigger forum_user_roles_refresh_author after insert or update or delete on public.forum_user_roles
for each row execute function private.refresh_author_role_cache();

do $$
declare
  v_user_id uuid;
  v_display_name text;
  v_avatar_url text;
begin
  select i.user_id,
         coalesce(i.identity_data->'custom_claims'->>'global_name', i.identity_data->>'full_name', i.identity_data->>'name', 'Игрок NaZerak'),
         i.identity_data->>'avatar_url'
    into v_user_id,v_display_name,v_avatar_url
  from auth.identities i
  where i.provider='discord'
    and i.provider_id='1129741865646837812'
  order by i.created_at
  limit 1;

  if v_user_id is not null then
    insert into public.forum_authors(id,display_name,avatar_url,minecraft_username,last_seen_at)
    values(v_user_id,v_display_name,v_avatar_url,'Hellsaiz',now())
    on conflict(id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,minecraft_username=excluded.minecraft_username,last_seen_at=excluded.last_seen_at;

    insert into public.forum_user_roles(user_id,role_slug,assigned_by)
    values(v_user_id,'administrator',v_user_id)
    on conflict(user_id,role_slug) do nothing;

    perform private.sync_forum_author_roles(v_user_id);
  end if;
end $$;

commit;
