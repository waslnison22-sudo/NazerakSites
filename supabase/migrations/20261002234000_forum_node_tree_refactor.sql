-- NaZerak forum node-tree refactor and route-aware public views.
begin;

alter table public.forum_categories
  add column if not exists parent_id bigint,
  add column if not exists node_type text not null default 'forum',
  add column if not exists route_slug text;

alter table public.forum_categories
  drop constraint if exists forum_categories_node_type_check;
alter table public.forum_categories
  add constraint forum_categories_node_type_check
  check (node_type in ('category','forum'));

create index if not exists forum_categories_parent_sort_idx
  on public.forum_categories(parent_id,sort_order,id);

create unique index if not exists forum_categories_route_slug_uidx
  on public.forum_categories(route_slug)
  where route_slug is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='forum_categories_parent_fk') then
    alter table public.forum_categories
      add constraint forum_categories_parent_fk
      foreign key(parent_id) references public.forum_categories(id)
      on delete restrict;
  end if;
end $$;

insert into public.forum_categories
  (slug,name,description,sort_order,icon,accent_color,area_slug,posting_mode,node_type,route_slug)
values
  ('information','Информация и правила','Официальная информация, правила и документы проекта.',10,'§','#c9d2df','administration','restricted','category',null),
  ('state','Государство и организации','Государственные структуры и организации мира NaZerak.',20,'◈','#f2c94c','administration','restricted','category',null),
  ('game-world','Игровой мир','РП-ситуации, персонажи, строительство и жизнь сервера.',30,'⌂','#5ac8fa','rp','restricted','category',null),
  ('support-center','Обращения и поддержка','Заявки, жалобы, техническая помощь и апелляции.',40,'!','#ff6f61','administration','restricted','category',null),
  ('development','Проект и развитие','Идеи, предложения, ошибки и развитие NaZerak.',50,'◆','#ff6b35','rp','restricted','category',null),
  ('community','Сообщество','Гайды, медиа и свободное общение.',60,'•','#a9adb7','rp','restricted','category',null)
on conflict (slug) do update
set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,
    icon=excluded.icon,accent_color=excluded.accent_color,area_slug=excluded.area_slug,
    posting_mode=excluded.posting_mode,node_type='category',route_slug=null;

update public.forum_categories
set node_type='forum',
    route_slug=case slug
      when 'announcements' then 'novosti-proekta'
      when 'rules' then 'pravila-i-dokumenty'
      when 'project' then 'o-proekte'
      when 'minecraft' then 'igrovye-voprosy'
      when 'government' then 'pravitelstvo'
      when 'applications' then 'zayavki'
      when 'help' then 'tehnicheskaya-podderzhka'
      when 'ideas' then 'predlozheniya'
      when 'appeals' then 'obrashcheniya'
      when 'off-topic' then 'kurilka'
      else route_slug end
where slug in ('announcements','rules','project','minecraft','government','applications','help','ideas','appeals','off-topic');

update public.forum_categories set slug='news',name='Новости проекта',
  description='Официальные новости, изменения и объявления.' where slug='announcements';
update public.forum_categories set slug='documents',name='Правила и документы',
  description='Правила проекта, регламенты и действующие документы.' where slug='rules';
update public.forum_categories set slug='project-info',name='О проекте',
  description='Общая информация об устройстве проекта и его развитии.' where slug='project';
update public.forum_categories set slug='game',name='Игровые вопросы',
  description='Общие вопросы по игровому миру и серверу.' where slug='minecraft';
update public.forum_categories set slug='requests',name='Заявки',
  description='Игровые и проектные заявки, анкеты и формы.' where slug='applications';
update public.forum_categories set slug='tech-support',name='Техническая поддержка',
  description='Проблемы с игрой, сайтом и подключением.' where slug='help';
update public.forum_categories set slug='suggestions',name='Предложения',
  description='Предложения по механикам, миру и развитию проекта.' where slug='ideas';
update public.forum_categories set slug='appeals-public',name='Обращения',
  description='Общие обращения и официальные запросы.' where slug='appeals';
update public.forum_categories set slug='lounge',name='Свободное общение',
  description='Общение вне основных игровых разделов.' where slug='off-topic';

insert into public.forum_categories
  (slug,name,description,sort_order,icon,accent_color,area_slug,posting_mode,node_type,route_slug,parent_id)
select v.slug,v.name,v.description,v.sort_order,v.icon,v.accent_color,v.area_slug,v.posting_mode,'forum',v.route_slug,p.id
from (values
  ('start-playing','Как начать играть','Базовая информация для новых игроков и порядок старта.',30,'→','#48d597','administration','official','kak-nachat-igrat','information'),
  ('faq','Частые вопросы','Короткие ответы на основные вопросы проекта.',40,'?','#5ac8fa','administration','official','faq','information'),
  ('judiciary','Суд','Судебная власть, документы и обращения.',20,'⚖','#c9d2df','administration','open','sud','state'),
  ('prokuratura','Прокуратура','Материалы, обращения и деятельность прокуратуры.',30,'!','#ff6f61','administration','open','prokuratura','state'),
  ('security-service','ФСБ','Официальный раздел специальной службы.',40,'◉','#7c8cff','administration','open','fsb','state'),
  ('army','Военная база','Военная структура, документы и обсуждения.',50,'▣','#8fa3b8','administration','open','voennaya-baza','state'),
  ('orgs','Организации','Государственные и негосударственные организации мира.',60,'◎','#ff6b35','administration','open','organizatsii','state'),
  ('scenes','RP-ситуации','Сюжетные ситуации и игровые инициативы.',20,'◇','#9b6cff','rp','open','rp-situatsii','game-world'),
  ('biographies','RP-биографии','Биографии персонажей и их история.',30,'◎','#9b6cff','rp','open','rp-biografii','game-world'),
  ('construction','Строительство','Постройки, районы, города и развитие мира.',40,'⌗','#48d597','rp','open','stroitelstvo','game-world'),
  ('events','Игровые мероприятия','Игровые события и совместные активности.',50,'✦','#ff71c8','rp','open','meropriyatiya','game-world'),
  ('player-complaints','Жалобы на игроков','Обращения по нарушениям со стороны игроков.',40,'!','#ff6f61','administration','open','zhaloby-na-igrokov','support-center'),
  ('admin-complaints','Жалобы на администрацию','Обращения по действиям администрации проекта.',50,'!','#ff334d','administration','open','zhaloby-na-administratsiyu','support-center'),
  ('amnesty-public','Амнистии и апелляции','Запросы на пересмотр наказаний и иные апелляции.',60,'↺','#ffd166','administration','open','amnistii','support-center'),
  ('bugs-public','Ошибки и баги','Сообщения об ошибках сайта и игры.',20,'×','#ff6f61','rp','open','oshibki-i-bagi','development'),
  ('media-public','Медиа','Скриншоты, видео и творчество сообщества.',10,'▧','#ff71c8','rp','open','media','community'),
  ('guides-public','Гайды','Полезные инструкции и знания игроков.',20,'?','#5ac8fa','rp','open','gajdy','community')
) v(slug,name,description,sort_order,icon,accent_color,area_slug,posting_mode,route_slug,parent_slug)
join public.forum_categories p on p.slug=v.parent_slug and p.node_type='category'
on conflict (slug) do update
set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,
    icon=excluded.icon,accent_color=excluded.accent_color,area_slug=excluded.area_slug,
    posting_mode=excluded.posting_mode,node_type='forum',route_slug=excluded.route_slug,parent_id=excluded.parent_id;

update public.forum_categories f
set parent_id=p.id
from public.forum_categories p
where p.node_type='category'
  and p.slug=case
    when f.slug in ('news','documents','start-playing','faq') then 'information'
    when f.slug in ('government','judiciary','prokuratura','security-service','army','orgs') then 'state'
    when f.slug in ('game','scenes','biographies','construction','events') then 'game-world'
    when f.slug in ('requests','tech-support','appeals-public','player-complaints','admin-complaints','amnesty-public') then 'support-center'
    when f.slug in ('project-info','suggestions','bugs-public') then 'development'
    when f.slug in ('media-public','guides-public','lounge') then 'community'
  end
where f.node_type='forum';

update public.forum_categories
set posting_mode='official'
where slug in ('news','documents','project-info');

update public.forum_categories
set posting_mode='restricted'
where node_type='category';

drop policy if exists "forum_topics_insert_own" on public.forum_topics;
create policy "forum_topics_insert_own"
on public.forum_topics
for insert
to authenticated
with check (
  (select auth.uid())=author_id
  and exists (
    select 1 from public.forum_categories c
    where c.id=category_id
      and c.node_type='forum'
      and (
        c.posting_mode='open'
        or (c.posting_mode='official' and (select private.has_forum_permission('publish_official')))
        or (c.posting_mode='restricted' and (select private.has_forum_permission('manage_categories')))
      )
  )
);

drop view if exists public.forum_topic_list;
drop view if exists public.forum_topic_detail;
drop view if exists public.forum_node_directory;
drop view if exists public.forum_my_permissions;

create view public.forum_topic_list with (security_invoker=true) as
select t.id,t.slug,t.category_id,
       c.slug category_slug,c.route_slug category_route_slug,c.name category_name,c.description category_description,
       c.parent_id category_parent_id,p.slug parent_slug,p.name parent_name,
       c.area_slug,c.node_type category_node_type,c.posting_mode category_posting_mode,
       t.author_public_id,t.author_display_name author_name,t.author_avatar_url,
       t.author_role_slug primary_role_slug,t.author_role_name primary_role_name,t.author_role_badge primary_role_badge,
       t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
       t.created_at,t.updated_at,t.last_post_at,t.reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id
left join public.forum_categories p on p.id=c.parent_id;

create view public.forum_topic_detail with (security_invoker=true) as
select t.id,t.slug,t.category_id,
       c.slug category_slug,c.route_slug category_route_slug,c.name category_name,c.description category_description,
       c.parent_id category_parent_id,p.slug parent_slug,p.name parent_name,
       c.area_slug,c.node_type category_node_type,c.posting_mode category_posting_mode,
       t.author_public_id,t.author_display_name author_name,t.author_avatar_url,
       t.author_role_slug primary_role_slug,t.author_role_name primary_role_name,t.author_role_badge primary_role_badge,
       t.title,t.body,t.is_pinned,t.is_locked,t.is_archived,t.prefix,t.views_count,t.solution_state,
       t.created_at,t.updated_at,t.last_post_at,t.reply_count
from public.forum_topics t
join public.forum_categories c on c.id=t.category_id
left join public.forum_categories p on p.id=c.parent_id;

create view public.forum_node_directory with (security_invoker=true) as
select c.id,c.slug,c.name,c.description,c.sort_order,c.icon,c.accent_color,
       c.area_slug,c.posting_mode,c.node_type,c.parent_id,c.route_slug,
       p.slug parent_slug,p.name parent_name,
       (select count(*)::integer from public.forum_topics t where t.category_id=c.id) topic_count,
       (select count(*)::integer from public.forum_posts fp join public.forum_topics ft on ft.id=fp.topic_id
        where ft.category_id=c.id and not fp.is_hidden) post_count
from public.forum_categories c
left join public.forum_categories p on p.id=c.parent_id;

create view public.forum_my_permissions with (security_invoker=true) as
select
  (select private.has_forum_permission('publish_official')) as can_publish_official,
  (select private.has_forum_permission('moderate_forum')) as can_moderate_forum,
  (select private.has_forum_permission('manage_roles')) as can_manage_roles,
  (select private.has_forum_permission('manage_categories')) as can_manage_categories;

revoke all on public.forum_topic_list,public.forum_topic_detail,public.forum_node_directory from anon,authenticated;
grant select on public.forum_topic_list,public.forum_topic_detail,public.forum_node_directory to anon,authenticated;
revoke all on public.forum_my_permissions from anon,authenticated;
grant select on public.forum_my_permissions to authenticated;
revoke all on public.forum_categories from anon,authenticated;
grant select (id,slug,name,description,sort_order,icon,accent_color,area_slug,posting_mode,node_type,parent_id,route_slug)
  on public.forum_categories to anon,authenticated;

commit;