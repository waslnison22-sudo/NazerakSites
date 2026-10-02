-- Align forum categories with the two-world model: player-facing RP vs administration.
begin;

insert into public.forum_categories(slug,name,description,sort_order,icon,accent_color,area_slug)
values('applications','Заявки','Игровые и проектные заявки, анкеты и официальные формы.',35,'□','#48d597','administration')
on conflict(slug) do update
set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,
    icon=excluded.icon,accent_color=excluded.accent_color,area_slug=excluded.area_slug;

update public.forum_categories set area_slug='administration',sort_order=40 where slug='help';
update public.forum_categories set area_slug='administration',sort_order=45 where slug='appeals';
update public.forum_categories set area_slug='rp',sort_order=35 where slug='government';
update public.forum_categories set area_slug='rp',sort_order=45 where slug='ideas';
update public.forum_categories set sort_order=60 where slug='off-topic';

commit;
