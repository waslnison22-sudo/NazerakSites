(() => {
  "use strict";
  const state={client:null,user:null,category:null,topics:[],permissions:null,q:"",page:1,pageSize:20};
  const qs=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.href:""}catch{return""}};
  const userName=u=>{const m=u?.user_metadata||{};return String(m.global_name||m.full_name||m.name||"Игрок NaZerak").trim().slice(0,64)||"Игрок NaZerak"};
  const userAvatar=u=>safeUrl(u?.user_metadata?.avatar_url||u?.user_metadata?.picture);
  const timeout=async(p,ms,msg)=>{let t;try{return await Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(msg)),ms)})])}finally{clearTimeout(t)}};
  const wait=async()=>{for(let i=0;i<100;i++){if(window.NaZerakAuth?.client)return window.NaZerakAuth.client;await new Promise(r=>setTimeout(r,100))}return null};
  const msg=(m,k="info")=>{const n=qs("[data-category-message]");if(!n)return;n.textContent=m;n.dataset.kind=k;n.hidden=!m};
  const relative=v=>{const d=new Date(v),diff=Date.now()-d.getTime();if(Number.isNaN(d.getTime()))return"—";const m=Math.max(0,Math.floor(diff/60000));if(m<1)return"только что";if(m<60)return m+" мин назад";const h=Math.floor(m/60);if(h<24)return h+" ч назад";const day=Math.floor(h/24);if(day<7)return day+" дн назад";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(d)};
  const filtered=()=>{const q=state.q.trim().toLowerCase();return state.topics.filter(t=>!q||[t.title,t.body,t.author_name,t.category_name].join(" ").toLowerCase().includes(q))};
  const renderPagination=(total)=>{
    const nav=qs("[data-category-pagination]");if(!nav)return;
    const pages=Math.max(1,Math.ceil(total/state.pageSize));state.page=Math.min(state.page,pages);
    if(pages<=1){nav.hidden=true;nav.innerHTML="";return}
    nav.hidden=false;
    let html='<button type="button" data-page="'+(state.page-1)+'" '+(state.page===1?"disabled":"")+'>←</button>';
    for(let i=1;i<=pages;i++){if(pages>7&&i>2&&i<pages-1&&Math.abs(i-state.page)>1){if(i===3||i===pages-2)html+='<span class="forum-pagination__ellipsis" aria-hidden="true">…</span>';continue}html+='<button type="button" data-page="'+i+'" aria-current="'+(i===state.page?'true':'false')+'">'+i+'</button>'}
    html+='<button type="button" data-page="'+(state.page+1)+'" '+(state.page===pages?"disabled":"")+'>→</button>';
    nav.innerHTML=html;
  };
  const render=()=>{
    const all=filtered(),total=all.length,start=(state.page-1)*state.pageSize,items=all.slice(start,start+state.pageSize);
    const count=qs("[data-category-result-count]");if(count){const n=total;count.textContent=n+" "+(n===1?"тема":n<5?"темы":"тем")}
    const root=qs("[data-category-topic-list]"),table=qs(".forum-thread-table"),empty=qs("[data-category-empty]");
    root.innerHTML=items.map(t=>{
      const a=safeUrl(t.author_avatar_url),av=a?'<img src="'+esc(a)+'" alt="">':esc((t.author_name||"N").slice(0,1).toUpperCase()),id=esc(t.author_public_id||"");
      const tags='<div class="forum-thread-row__tags"><span>'+esc(t.category_name||"Форум")+'</span>'+(t.prefix?'<span>'+esc(t.prefix)+'</span>':"")+(t.is_pinned?'<span>Закреплено</span>':"")+(t.is_locked?'<span>Закрыто</span>':"")+'</div>';
      const author=id?'<a class="forum-user-link forum-thread-row__author" data-forum-user="'+id+'" href="/user/'+id+'"><span class="forum-avatar forum-avatar--small">'+av+'</span><span>'+esc(t.author_name||"Игрок NaZerak")+'</span></a>':'<span class="forum-thread-row__author"><span class="forum-avatar forum-avatar--small">'+av+'</span><span>'+esc(t.author_name||"Игрок NaZerak")+'</span></span>';
      return '<article class="forum-thread-row"><div class="forum-thread-row__main"><a class="forum-thread-row__link" href="/forum/topic/'+encodeURIComponent(t.id)+'">'+tags+'<div class="forum-thread-row__title">'+esc(t.title)+'</div></a><div class="forum-thread-row__meta">'+author+'<span>·</span><time datetime="'+esc(t.last_post_at||"")+'">'+relative(t.last_post_at)+'</time></div></div><div class="forum-thread-row__count"><strong>'+Number(t.reply_count||0)+'</strong><span>ответов</span></div><div class="forum-thread-row__last"><strong>Последняя активность</strong><time datetime="'+esc(t.last_post_at||"")+'">'+relative(t.last_post_at)+'</time></div></article>'
    }).join("");
    table.hidden=!items.length;empty.hidden=items.length>0;
    renderPagination(total);
  };
  const load=async()=>{
    const slug=decodeURIComponent(location.pathname.match(/^\/forum\/([^/]+)\/?$/i)?.[1]||new URLSearchParams(location.search).get("slug")||"").toLowerCase();
    if(!slug)throw new Error("Раздел не указан.");
    const req=[
      state.client.from("forum_node_directory").select("id,name,posting_mode,parent_name").eq("route_slug",slug).maybeSingle(),
      state.client.from("forum_categories").select("id,name,posting_mode,node_type,parent_id,route_slug").eq("route_slug",slug).maybeSingle(),
      state.client.from("forum_topic_list").select("id,category_name,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,title,body,is_pinned,is_locked,prefix,last_post_at,reply_count").eq("category_route_slug",slug).order("is_pinned",{ascending:false}).order("last_post_at",{ascending:false}).limit(500)
    ];
    if(state.user)req.push(state.client.from("forum_my_permissions").select("can_publish_official,can_moderate_forum").maybeSingle());
    const [cat,nodeMeta,topics,permissions]=await timeout(Promise.all(req),10000,"Загрузка раздела превысила 10 секунд. Попробуй обновить страницу.");
    if(cat.error)throw new Error(cat.error.message);if(!cat.data)throw new Error("Раздел не найден.");if(nodeMeta.error)throw new Error(nodeMeta.error.message);if(!nodeMeta.data)throw new Error("Метаданные раздела не найдены.");if(topics.error)throw new Error(topics.error.message);
    state.category={...cat.data,posting_mode:nodeMeta.data.posting_mode||cat.data.posting_mode,parent_id:nodeMeta.data.parent_id||cat.data.parent_id,node_type:nodeMeta.data.node_type||cat.data.node_type,route_slug:nodeMeta.data.route_slug||cat.data.route_slug};
    state.topics=topics.data||[];state.permissions=permissions?.data||null;
    qs("[data-category-parent]").textContent=state.category.parent_name||"Форумы";qs("[data-category-name]").textContent=state.category.name;qs("[data-category-title]").innerHTML=esc(state.category.name)+"<span>.</span>";
    const canCreate=state.category.posting_mode==="open"||Boolean(state.permissions?.can_publish_official);document.querySelectorAll("[data-category-create]").forEach(b=>b.hidden=!canCreate);
    document.title="NaZerak — "+state.category.name;render();
  };
  const syncAuthor=async()=>{const r=await state.client.from("forum_authors").upsert({id:state.user.id,display_name:userName(state.user),avatar_url:userAvatar(state.user)||null,updated_at:new Date().toISOString(),last_seen_at:new Date().toISOString()},{onConflict:"id"});return !r.error};
  const create=async()=>{
    if(!state.user){location.href="/cabinet";return}
    const form=qs("[data-category-form]"),button=qs("[data-category-submit]"),data=new FormData(form),title=String(data.get("title")||"").trim(),body=String(data.get("body")||"").trim();
    if(title.length<3||!body){msg("Заполни заголовок и сообщение.","error");return}
    button.disabled=true;
    try{if(!(await syncAuthor())){msg("Не удалось сохранить форумный профиль.","error");return}const r=await state.client.from("forum_topics").insert({category_id:state.category.id,author_id:state.user.id,title,body}).select("id").single();if(r.error||!r.data?.id){msg("Не удалось создать тему. Проверь права и соединение.","error");return}location.href="/forum/topic/"+encodeURIComponent(r.data.id)}catch(e){msg("Не удалось создать тему из-за ошибки соединения.","error")}finally{button.disabled=false}
  };
  const init=async()=>{
    state.client=await wait();if(!state.client){msg("Не удалось подключиться к форуму.","error");return}
    state.user=window.NaZerakAuth?.user||null;
    document.querySelectorAll("[data-category-create]").forEach(b=>b.addEventListener("click",()=>state.user?qs("[data-category-modal]")?.showModal():location.href="/cabinet"));
    qs("[data-category-submit]")?.addEventListener("click",create);
    qs("[data-category-search-form]")?.addEventListener("submit",e=>{e.preventDefault();state.page=1;state.q=String(qs("#category-search")?.value||"");render()});
    qs("#category-search")?.addEventListener("input",e=>{state.page=1;state.q=e.target.value||"";qs("[data-category-search-clear]").hidden=!state.q;render()});
    qs("[data-category-search-clear]")?.addEventListener("click",()=>{state.q="";state.page=1;qs("#category-search").value="";qs("[data-category-search-clear]").hidden=true;render();qs("#category-search").focus()});
    qs("[data-category-pagination]")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b||b.disabled)return;state.page=Number(b.dataset.page);render();window.scrollTo({top:document.querySelector(".forum-list-shell")?.offsetTop-80||0,behavior:"smooth"})});
    try{await load()}catch(e){msg(e instanceof Error?e.message:"Не удалось загрузить раздел.","error")}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();