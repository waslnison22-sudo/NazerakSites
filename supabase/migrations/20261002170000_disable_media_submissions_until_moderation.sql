begin;

revoke all on table public.media_applications from authenticated;

-- The public site has no active media-application workflow yet.
-- Keep the table as a future moderation foundation, but do not accept
-- submissions until an authenticated review queue exists.

commit;
