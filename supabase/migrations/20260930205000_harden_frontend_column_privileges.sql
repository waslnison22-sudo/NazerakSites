begin;

revoke insert, update, delete, references, trigger, truncate
  on table public.profiles
  from authenticated;

revoke insert, update, delete, references, trigger, truncate
  on table public.media_applications
  from authenticated;

grant insert (id, minecraft_username)
  on table public.profiles to authenticated;

grant update (minecraft_username, updated_at)
  on table public.profiles to authenticated;

grant insert (user_id, channel_url, message)
  on table public.media_applications to authenticated;

commit;
