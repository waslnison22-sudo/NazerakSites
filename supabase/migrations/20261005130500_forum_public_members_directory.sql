begin;

create or replace function private.sync_forum_author_from_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_display_name text;
  v_avatar_url text;
begin
  select
    coalesce(
      nullif(u.raw_user_meta_data ->> 'global_name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      'Игрок NaZerak'
    ),
    nullif(u.raw_user_meta_data ->> 'avatar_url', '')
  into v_display_name, v_avatar_url
  from auth.users u
  where u.id = new.id;

  if new.id is null then
    return new;
  end if;

  insert into public.forum_authors (
    id, display_name, avatar_url, minecraft_username, joined_at, last_seen_at
  )
  values (
    new.id,
    coalesce(v_display_name, 'Игрок NaZerak'),
    v_avatar_url,
    nullif(new.minecraft_username, ''),
    now(),
    now()
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        minecraft_username = excluded.minecraft_username;

  return new;
end;
$$;

revoke all on function private.sync_forum_author_from_profile() from public, anon, authenticated;

drop trigger if exists forum_profile_sync_author on public.profiles;
create trigger forum_profile_sync_author
after insert or update of minecraft_username on public.profiles
for each row
execute function private.sync_forum_author_from_profile();

insert into public.forum_authors (
  id, display_name, avatar_url, minecraft_username, joined_at, last_seen_at
)
select
  p.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'global_name', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    'Игрок NaZerak'
  ),
  nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
  nullif(p.minecraft_username, ''),
  coalesce(a.joined_at, now()),
  coalesce(a.last_seen_at, now())
from public.profiles p
join auth.users u on u.id = p.id
left join public.forum_authors a on a.id = p.id
on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      minecraft_username = excluded.minecraft_username;

commit;
