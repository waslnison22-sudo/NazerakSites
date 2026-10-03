(() => {
  "use strict";
  const state={client:null,user:null,category:null,topics:[],permissions:null};
  const qs=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v==null?"":v).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl=(v)=>{try{const u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.href:"";}catch{return"";}};
  const userName=(u)=>{const m=u?.user_metadata||{};return String(m.global_name||m.full_name||m.name||"Игрок NaZerak").trim().slice(0,64)||"Игрок NaZerak";};
  const userAvatar=(u)=>safeUrl(u?.user_metadata?.avatar_url||u?.user_metadata?.picture);
  const withTimeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>window.setTimeout(()=>reject(new Error(message)),ms))]);
  const wait=async()=>{for(let i=0;i<100;i++){if(window.NaZerakAuth?.client)return window.NaZerakAuth.client;await new Promise(r=>setTimeout(r,100));}return null;};
  const msg=(m,k="info")=>{const n=qs("[data-category-message]");if(!n)return;n.textContent=m;n.dataset.kind=k;n.hidden=!m;};
  const relative=(v)=>{const d=new Date(v),diff=Date.now()-d.getTime();if(Number.isNaN(d.getTime()))return"—";const m=Math.max(0,Math.floor(diff/60000));if(m<1)return"только что";if(m<60)return m+" мин назад";const h=Math.floor(m/60);if(h<24)return h+" ч назад";const day=Math.floor(h/24);if(day<7)return day+" дн назад";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(d);};
  const load=async()=>{
    const slug=String(new URLSearchParams(location.search).get("slug")||"").toLowerCase();
    if(!slug)throw new Error("Раздел не указан.");
    const requests=[
      state.client.from("forum_node_directory").select("id,name,description,posting_mode,parent_name").eq("route_slug",slug).maybeSingle(),
      state.client.from("forum_topic_list").select("id,category_name,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,title,body,is_pinned,is_locked,prefix,last_post_at,reply_count").eq("category_route_slug",slug).order("is_pinned",{ascending:false}).order("last_post_at",{ascending:false}).limit(100)
    ];
    if(state.user) requests.push(state.client.from("forum_my_permissions").select("can_publish_official,can_moderate_forum").maybeSingle());
    const [cat,topics,permissions]=await withTimeout(Promise.all(requests),10000,"Загрузка раздела превысила 10 секунд. Попробуй обновить страницу.");
    if(cat.error)throw new Error(cat.error.message);if(!cat.data)throw new Error("Раздел не найден.");
    if(topics.error)throw new Error(topics.error.message); if(permissions?.error) console.warn("[NaZerak Forum] permission lookup:",permissions.error.message);
    state.category=cat.data;state.topics=topics.data||[];state.permissions=permissions?.data||null;
    qs("[data-category-parent]").textContent=state.category.parent_name||"Форумы";
    qs("[data-category-name]").textContent=state.category.name;
    qs("[data-category-title]").innerHTML=escapeHtml(state.category.name)+"<span>.</span>";
    qs("[data-category-description]").textContent=state.category.description||"";
    const canCreate = state.category.posting_mode==="open" || Boolean(state.permissions?.can_publish_official);
    document.querySelectorAll("[data-category-create]").forEach((button)=>{button.hidden=!canCreate;});    const count=qs("[data-category-result-count]");const n=state.topics.length;n===1?count.textContent="1 тема":n<5?count.textContent=n+" темы":count.textContent=n+" тем";
    const root=qs("[data-category-topic-list]");const empty=qs("[data-category-empty]");
    root.innerHTML=state.topics.map(t=>{
      const avatar=safeUrl(t.author_avatar_url);const av=avatar?'<img src="'+escapeHtml(avatar)+'" alt="">':escapeHtml((t.author_name||"N").slice(0,1).toUpperCase());
      const prefix=t.prefix?'<span class="forum-topic-row__prefix">'+escapeHtml(t.prefix)+'</span>':"";
      const status=t.is_locked?'<span>ЗАКРЫТО</span>':t.is_pinned?'<span>ЗАКРЕПЛЕНО</span>':"";
      return '<article class="forum-thread-row">'+
        '<div class="forum-thread-row__icon">'+(t.is_pinned?"★":"›")+'</div>'+
        '<div class="forum-thread-row__main"><a href="./topic.html?id='+encodeURIComponent(t.id)+'"><div class="forum-topic-row__tags"><span>'+escapeHtml(t.category_name)+'</span>'+prefix+status+'</div><h3>'+escapeHtml(t.title)+'</h3><p>'+escapeHtml(String(t.body||"").replace(/\s+/g," ").slice(0,150))+'</p></a>'+
        '<a class="forum-user-link forum-role--'+escapeHtml(t.primary_role_slug||"player")+'" data-forum-user="'+escapeHtml(t.author_public_id||"")+'" href="./forum-user.html?id='+encodeURIComponent(t.author_public_id||"")+'"><span class="forum-avatar forum-avatar--small">'+av+'</span><span>'+escapeHtml(t.author_name||"Игрок NaZerak")+'</span><span class="forum-user-link__role">'+escapeHtml(t.primary_role_badge||"•")+" "+escapeHtml(t.primary_role_name||"Игрок")+'</span></a></div>'+
        '<div class="forum-thread-row__replies"><strong>'+Number(t.reply_count||0)+'</strong><span>ответов</span></div>'+
        '<div class="forum-thread-row__last"><time datetime="'+escapeHtml(t.last_post_at)+'">'+relative(t.last_post_at)+'</time></div>'+
      '</article>';
    }).join("");
    empty.hidden=state.topics.length>0;
    document.title="NaZerak — "+state.category.name;
  };
  const create=async()=>{
    if(!state.user){location.href="./cabinet.html";return;}
    const form=qs("[data-category-form]"),title=String(new FormData(form).get("title")||"").trim(),body=String(new FormData(form).get("body")||"").trim(),button=qs("[data-category-submit]");
    if(title.length<3||!body){msg("Заполни заголовок и сообщение.","error");return;}
    button.disabled=true;await state.client.from("forum_authors").upsert({id:state.user.id,display_name:userName(state.user),avatar_url:userAvatar(state.user)||null,last_seen_at:new Date().toISOString()},{onConflict:"id"});
    const r=await state.client.from("forum_topics").insert({category_id:state.category.id,author_id:state.user.id,title,body}).select("id").single();
    button.disabled=false;if(r.error){msg(r.error.message,"error");return;}location.href="./topic.html?id="+encodeURIComponent(r.data.id);
  };
  const init=async()=>{state.client=await wait();if(!state.client){msg("Не удалось подключиться к форуму.","error");return;}try{const session=await withTimeout(state.client.auth.getSession(),8000,"");state.user=session.data?.session?.user||null;}catch{state.user=window.NaZerakAuth?.user||null;}qs("[data-category-create]")?.addEventListener("click",()=>state.user?qs("[data-category-modal]")?.showModal():location.href="./cabinet.html");qs("[data-category-submit]")?.addEventListener("click",create);try{await load();}catch(e){msg(e instanceof Error?e.message:"Не удалось загрузить раздел.","error");}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();