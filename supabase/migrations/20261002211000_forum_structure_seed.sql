-- Applied after forum role/profile foundation.
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

insert into public.forum_topics(category_id,author_id,slug,title,body,prefix,is_pinned)
select c.id,'d71f025e-f045-4778-8b53-db519f8f4955',s.slug,s.title,s.body,s.prefix,s.pinned
from (
  select 'announcements' category,'welcome-to-nazerak' slug,'Добро пожаловать на форум NaZerak' title,'Форум стал центральным местом для обсуждений проекта. Здесь будут новости, игровые вопросы, предложения и отдельные разделы для организаций мира. Перед новой темой проверь поиск и выбери подходящий раздел.' body,'ВАЖНО' prefix,true pinned
  union all select 'rules','forum-rules','Правила форума: базовые принципы','Уважай других участников, не публикуй чужие персональные данные, не дублируй темы и используй специальные разделы по назначению. Подробные правила будут дополняться вместе с игровыми документами.','ПРАВИЛА',true
  union all select 'project','city-development','Как развивать город NaZerak?','Собираем первые предложения по районам, дорогам, общественным пространствам и инфраструктуре. Важно обсуждать не только отдельные здания, но и удобство города целиком.','ОБСУЖДЕНИЕ',false
  union all select 'government','state-and-organizations','Государство и организации: структура мира','Предлагается использовать этот раздел для обсуждения игровых государственных органов, организаций, их взаимодействия и оформления. Конкретные полномочия будут закрепляться игровыми документами.','ГОСУДАРСТВО',false
  union all select 'help','minecraft-connection-help','Не получается подключиться к серверу — что проверить?','Проверь Java Edition, версию клиента 1.21.11 и адрес сервера nazehard.rustix.cc. Здесь можно разбирать технические проблемы подключения и помогать другим игрокам.','ПОМОЩЬ',false
  union all select 'ideas','forum-ideas-start-here','Какие функции нужны форуму в первую очередь?','Собираем предложения по уведомлениям, подпискам, реакциям, поиску, игровым профилям, отметкам решения и инструментам модерации.','ИДЕИ',false
  union all select 'appeals','appeals-structure','Как будут устроены обращения и жалобы?','Раздел предназначен для организованных обращений. В дальнейшем здесь появятся отдельные шаблоны, статусы и порядок обработки, чтобы обращения не терялись в общей ленте.','ИНФОРМАЦИЯ',false
  union all select 'off-topic','offtopic-launch','Свободное общение','Место для спокойного общения вне основных игровых разделов: знакомство, общие темы и разговоры сообщества.','ОБЩЕНИЕ',false
  union all select 'minecraft','minecraft-world-builds','Показываем свои постройки','Делитесь скриншотами, идеями и планами строительства. Со временем здесь можно будет собрать полноценную галерею мира NaZerak.','МИР',false
) s join public.forum_categories c on c.slug=s.category
where not exists(select 1 from public.forum_topics t where t.slug=s.slug);

commit;
