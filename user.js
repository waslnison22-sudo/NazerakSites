(() => {
  "use strict";
  const qs=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const formatDate=(v)=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return"—";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"long",year:"numeric"}).format(d)};
  const showMessage=(m,k)=>{const n=qs("[data-user-message]");if(!n)return;n.textContent=m;n.dataset.kind=k||"error";n.hidden=!m};
  const waitForClient=async()=>{for(let i=0;i<100;i+=1){const c=window.NaZerakAuth&&window.NaZerakAuth.client;if(c)return c;await new Promise(r=>window.setTimeout(r,100))}return null};
  const withTimeout=async(promise,ms,message)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(new Error(message)),ms);})]);}finally{window.clearTimeout(timer);}};
  const init=async()=>{
    const publicId=new URLSearchParams(location.search).get("id");
    if(!publicId){showMessage("Профиль не указан.");return;}
    const client=await waitForClient();
    if(!client){showMessage("Не удалось подключиться к форуму.");return;}
    let result;try{result=await withTimeout(client.from("forum_author_directory").select("public_id,display_name,avatar_url,bio,minecraft_username,joined_at,last_seen_at,topic_count,post_count,role_slugs,primary_role_slug,primary_role_name,primary_role_badge").eq("public_id",publicId).maybeSingle(),8000,"Загрузка профиля превысила 8 секунд.");}catch(e){showMessage(e instanceof Error?e.message:"Не удалось загрузить профиль.");return;}
    if(result.error){showMessage("Не удалось загрузить профиль. Попробуй обновить страницу.");return;}if(!result.data){showMessage("Профиль не найден.");return;}
    const p=result.data;
    qs("[data-user-profile]").hidden=false;
    qs("[data-user-content]").hidden=false;
    qs("[data-user-name]").textContent=p.display_name||"Игрок NaZerak";
    qs("[data-user-bio]").textContent=p.bio||"Участник форума NaZerak.";
    qs("[data-user-minecraft]").textContent=p.minecraft_username||"Не указан";
    qs("[data-user-joined]").textContent=formatDate(p.joined_at);
    qs("[data-user-lastseen]").textContent=p.last_seen_at?formatDate(p.last_seen_at):"—";
    qs("[data-user-topic-count]").textContent=String(p.topic_count||0);
    qs("[data-user-post-count]").textContent=String(p.post_count||0);
    qs("[data-user-initial]").textContent=(p.display_name||"N").slice(0,1).toUpperCase();
    const img=qs("[data-user-avatar]");
    if(p.avatar_url){img.hidden=false;img.src=p.avatar_url;img.alt="";}
    const roles=Array.isArray(p.role_slugs)?p.role_slugs:[];
    qs("[data-user-roles]").innerHTML=roles.map(r=>window.NaZerakForumUI.roleBadge(r.slug,r.name,r.badge)).join("");
    let topics;try{topics=await withTimeout(client.from("forum_topic_list").select("id,title,category_name,last_post_at,reply_count,is_pinned,author_public_id,primary_role_slug").eq("author_public_id",publicId).order("last_post_at",{ascending:false}).limit(10),8000,"Загрузка тем профиля превысила 8 секунд.");}catch(e){showMessage(e instanceof Error?e.message:"Не удалось загрузить темы профиля.");return;}
    const root=qs("[data-user-topics]");
    if(topics.error){root.innerHTML='<div class="forum-user__empty">Не удалось загрузить последние темы.</div>';return;}if(!topics.data||!topics.data.length){root.innerHTML='<div class="forum-user__empty">Пока нет опубликованных тем.</div>';return;}
    root.innerHTML=topics.data.map(t=>'<a class="forum-user-topic" href="./topic.html?id='+encodeURIComponent(t.id)+'"><span class="forum-user-topic__category">'+escapeHtml(t.category_name)+'</span><strong>'+escapeHtml(t.title)+'</strong><span>'+Number(t.reply_count||0)+' ответов · '+formatDate(t.last_post_at)+'</span></a>').join("");
    document.title="NaZerak — "+(p.display_name||"Профиль");
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();