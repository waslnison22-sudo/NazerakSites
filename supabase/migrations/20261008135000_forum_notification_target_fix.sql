create or replace function private.forum_notify_topic_reply()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  topic_author uuid;
  topic_title text;
begin
  select author_id, title into topic_author, topic_title
  from public.forum_topics
  where id = new.topic_id;

  if topic_author is not null and topic_author <> new.author_id then
    insert into public.forum_notifications(user_id,actor_id,topic_id,post_id,type,title,body)
    values(topic_author,new.author_id,new.topic_id,new.id,'reply','Новый ответ в вашей теме',topic_title);
  end if;

  insert into public.forum_notifications(user_id,actor_id,topic_id,post_id,type,title,body)
  select w.user_id,new.author_id,new.topic_id,new.id,'reply','Новый ответ в отслеживаемой теме',topic_title
  from public.forum_topic_watchers w
  where w.topic_id=new.topic_id
    and w.user_id <> new.author_id
    and w.user_id <> topic_author;

  return new;
end;
$$;