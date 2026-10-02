-- Forum structure metadata. Topic seeding is intentionally disabled; content is created manually.
begin;

alter table public.forum_topics add column if not exists slug text;
alter table public.forum_topics add column if not exists solution_state text not null default 'none';
alter table public.forum_topics add column if not exists views_count integer not null default 0;
alter table public.forum_topics add column if not exists prefix text not null default '';
alter table public.forum_topics add column if not exists is_archived boolean not null default false;
create unique index if not exists forum_topics_slug_uidx on public.forum_topics(slug) where slug is not null;

alter table public.forum_posts add column if not exists is_hidden boolean not null default false;
alter table public.forum_posts add column if not exists edited_at timestamptz;

insert into public.forum_categories(slug,name,description,sort_order) values
('rules','Правила и документы','Официальные правила форума, проекта и игровые документы.',15),
('government','Государство и организации','Игровые государственные органы и организации.',35),
('appeals','Жалобы и обращения','Организованные обращения к ответственным лицам.',60),
('off-topic','Свободное общение','Общение вне основных игровых разделов.',70)
on conflict(slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order;

update public.forum_categories set name='Проект и развитие',description='Обсуждение NaZerak, его систем и будущих обновлений.' where slug='project';
update public.forum_categories set name='Игровой мир',description='Города, строительство, события и жизнь игрового мира.' where slug='minecraft';

-- Topic seeding intentionally omitted. Real forum topics are created manually.\n\ncommit;
