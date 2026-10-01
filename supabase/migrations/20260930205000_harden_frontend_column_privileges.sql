begin;

revoke all on table public.profiles, public.media_applications from anon;

revoke insert, update, delete, references, trigger, truncate
  on table public.profiles
  from authenticated;

revoke insert, update, delete, references, trigger, truncate
  on table public.media_applications
  from authenticated;

grant select on public.profiles to authenticated;
grant select on public.media_applications to authenticated;

grant insert (id, minecraft_username)
  on table public.profiles to authenticated;

grant update (minecraft_username, updated_at)
  on table public.profiles to authenticated;

grant insert (user_id, channel_url, message)
  on table public.media_applications to authenticated;

grant usage, select on sequence public.media_applications_id_seq to authenticated;

commit;
