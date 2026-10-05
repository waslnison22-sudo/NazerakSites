(() => {
  "use strict";

  const state = { client:null, user:null, nodes:[], topics:[], permissions:null, search:"" };
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const escapeHtml=(v)=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl=(v)=>{try{const u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.href:"";}catch{return"";}};
  const showMessage=(message,kind="info")=>{const n=qs("[data-forum-message]");if(!n)return;n.textContent=message;n.dataset.kind=kind;n.hidden=!message;};
  const formatDate=(v)=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return"—";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(d);};
  const relative=(v)=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return"—";const diff=Math.max(0,Date.now()-d.getTime()),m=Math.floor(diff/60000);if(m<1)return"только что";if(m<60)return m+" мин назад";const h=Math.floor(m/60);if(h<24)return h+" ч назад";const days=Math.floor(h/24);if(days<7)return days+" дн назад";return formatDate(v);};
  const userName=(u)=>{const m=u?.user_metadata||{};return String(m.global_name||m.full_name||m.name||m.user_name||m.preferred_username||"Игрок NaZerak").trim().slice(0,64)||"Игрок NaZerak";};
  const userAvatar=(u)=>{const m=u?.user_metadata||{};const url=safeUrl(m.avatar_url||m.picture);if(!url)return null;try{const host=new URL(url).hostname.toLowerCase();return host==="cdn.discordapp.com"||host==="media.discordapp.net"?url:null;}catch{return null;}};
  const withTimeout=async(promise,ms,message)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(new Error(message)),ms);})]);}finally{window.clearTimeout(timer);}};
  const waitForClient=async()=>{for(let i=0;i<100;i+=1){if(window.NaZerakAuth?.client)return window.NaZerakAuth.client;await new Promise(r=>window.setTimeout(r,100));}return null;};
  const UI=()=>window.NaZerakForumUI||{};
  const catIcon=(raw)=>{const u=UI();return u.categoryIcon?u.categoryIcon(raw):"";};
  const svgIcon=(name,size)=>{const u=UI();return u.icon?u.icon(name,size):"";};
  const syncAuthor=async()=>{if(!state.client||!state.user)return false;const r=await state.client.from("forum_authors").upsert({id:state.user.id,display_name:userName(state.user),avatar_url:userAvatar(state.user)||null,updated_at:new Date().toISOString(),last_seen_at:new Date().toISOString()},{onConflict:"id"});if(r.error){console.warn("[NaZerak Forum] author sync:",r.error.message);return false;}return true;};

  const topicsFor=(id)=>state.topics.filter(t=>Number(t.category_id)===Number(id));
  const renderNodeTree=()=>{
    const root=qs("[data-forum-node-tree]");if(!root)return;
    const parents=state.nodes.filter(n=>n.node_type==="category").sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)||Number(a.id)-Number(b.id));
    root.innerHTML=parents.map(parent=>{
      const children=state.nodes.filter(n=>n.node_type==="forum"&&Number(n.parent_id)===Number(parent.id)).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)||Number(a.id)-Number(b.id));
      if(!children.length)return"";
      const rows=children.map(node=>{
        const topics=topicsFor(node.id);
        const posts=topics.reduce((sum,t)=>sum+1+Number(t.reply_count||0),0);
        const latest=[...topics].sort((a,b)=>new Date(b.last_post_at).getTime()-new Date(a.last_post_at).getTime())[0];
        const latestHtml=latest
          ? '<a class="forum-board-row__last" href="./topic.html?id='+encodeURIComponent(latest.id)+'"><strong>'+escapeHtml(latest.title)+'</strong><span>'+escapeHtml(latest.author_name||"Игрок NaZerak")+' · '+relative(latest.last_post_at)+'</span></a>'
          : '<span class="forum-board-row__last forum-board-row__last--empty">Пока нет тем</span>';
        return '<article class="forum-board-row"><a class="forum-board-row__forum" href="./forum-category.html?slug='+encodeURIComponent(node.route_slug||node.slug)+'"><span class="forum-category-card__icon">'+catIcon(node.icon)+'</span><span><strong>'+escapeHtml(node.name)+'</strong>'+(node.description?'<small>'+escapeHtml(node.description)+'</small>':"")+'</span></a><span class="forum-board-row__stat">'+topics.length+'</span><span class="forum-board-row__stat">'+posts+'</span>'+latestHtml+'</article>';
      }).join("");
      return '<section class="forum-node-section"><header class="forum-node-section__head"><div><span class="section-kicker">SECTION</span><h3>'+escapeHtml(parent.name)+'<span>.</span></h3></div><span class="forum-node-section__count">'+children.length+' '+(children.length===1?"форум":children.length<5?"форума":"форумов")+'</span></header><div class="forum-board__columns"><span>Форум</span><span>Темы</span><span>Сообщения</span><span>Последнее сообщение</span></div><div class="forum-node-section__rows">'+rows+'</div></section>';
    }).join("");
    const count=qs("[data-forum-board-count]");const n=state.nodes.filter(x=>x.node_type==="forum").length;
    if(count)count.textContent=n+" "+(n===1?"форум":n<5?"форума":"форумов");
  };

  const renderTopics=()=>{
    const root=qs("[data-forum-topic-list]"),empty=qs("[data-forum-empty]");if(!root||!empty)return;
    const q=state.search.trim().toLowerCase();
    const topics=q?state.topics.filter(t=>[t.title,t.body,t.category_name,t.author_name,t.parent_name].join(" ").toLowerCase().includes(q)):state.topics;
    const noun=topics.length===1?"тема":topics.length<5?"темы":"тем";
    qs("[data-forum-result-count]")?.replaceChildren(document.createTextNode(topics.length+" "+noun));
    if(!topics.length){root.hidden=true;empty.hidden=false;return;}
    root.hidden=false;empty.hidden=true;
    root.innerHTML=topics.map(t=>{
      const avatar=safeUrl(t.author_avatar_url),av=avatar?'<img src="'+escapeHtml(avatar)+'" alt="">':escapeHtml((t.author_name||"N").slice(0,1).toUpperCase());
      const publicId=escapeHtml(t.author_public_id||"");
      return '<article class="forum-topic-row'+(t.is_pinned?" is-pinned":"")+'"><a class="forum-topic-row__open" href="./topic.html?id='+encodeURIComponent(t.id)+'"><div class="forum-topic-row__mark" aria-hidden="true">'+(t.is_pinned?svgIcon("pin",18):svgIcon("chat",18))+'</div><div class="forum-topic-row__copy"><div class="forum-topic-row__tags"><span>'+escapeHtml(t.category_name||"Форум")+'</span>'+(t.prefix?'<span class="forum-topic-row__prefix">'+escapeHtml(t.prefix)+'</span>':"")+(t.is_locked?window.NaZerakForumUI.chip("lock","Закрыто"):"")+'</div><h3>'+escapeHtml(t.title)+'</h3><p>'+escapeHtml(String(t.body||"").replace(/\s+/g," ").slice(0,160))+'</p></div></a><div class="forum-topic-row__footer"><a class="forum-user-link forum-role--'+escapeHtml(t.primary_role_slug||"player")+'" data-forum-user="'+publicId+'" href="./forum-user.html?id='+publicId+'"><span class="forum-avatar forum-avatar--small">'+av+'</span><span>'+escapeHtml(t.author_name||"Игрок NaZerak")+'</span><span class="forum-user-link__role">'+escapeHtml(t.primary_role_name||"Игрок")+'</span></a><div class="forum-topic-row__activity"><strong>'+Number(t.reply_count||0)+'</strong><span>ответов</span><time datetime="'+escapeHtml(t.last_post_at)+'">'+relative(t.last_post_at)+'</time></div></div></article>';
    }).join("");
  };

  const fillCategorySelect=()=>{
    const select=qs("#forum-category");if(!select)return;
    const allowed=state.nodes.filter(n=>n.node_type==="forum"&&(n.posting_mode==="open"||Boolean(state.permissions?.can_publish_official))).sort((a,b)=>String(a.parent_name||"").localeCompare(String(b.parent_name||""))||Number(a.sort_order)-Number(b.sort_order));
    select.innerHTML=allowed.map(n=>'<option value="'+escapeHtml(n.id)+'">'+escapeHtml(n.parent_name?n.parent_name+" — ":"")+escapeHtml(n.name)+'</option>').join("");
    qs("[data-forum-submit]")?.toggleAttribute("disabled",allowed.length===0);
  };

  const loadData=async()=>{
    const req=[
      state.client.from("forum_node_directory").select("id,slug,name,description,sort_order,icon,posting_mode,node_type,parent_id,route_slug,parent_name").order("sort_order",{ascending:true}).order("id",{ascending:true}),
      state.client.from("forum_topic_list").select("id,category_id,category_name,parent_name,author_public_id,author_name,author_avatar_url,primary_role_slug,title,body,is_pinned,is_locked,prefix,last_post_at,reply_count").order("is_pinned",{ascending:false}).order("last_post_at",{ascending:false}).limit(100),
      state.client.from("forum_community_stats").select("member_count,online_count").maybeSingle()
    ];
    if(state.user)req.push(state.client.from("forum_my_permissions").select("can_publish_official,can_moderate_forum,can_manage_roles,can_manage_categories").maybeSingle());
    const res=await withTimeout(Promise.all(req),10000,"Загрузка форума превысила 10 секунд. Проверь соединение и попробуй обновить страницу.");
    if(res[0].error)throw new Error(res[0].error.message||"Не удалось загрузить структуру форума.");
    if(res[1].error)throw new Error(res[1].error.message||"Не удалось загрузить темы форума.");
    if(res[2].error)console.warn("[NaZerak Forum] stats:",res[2].error.message);
    state.nodes=res[0].data||[];state.topics=res[1].data||[];state.permissions=state.user?res[3]?.data||null:null;
    const stats=res[2].data||{member_count:0,online_count:0};
    qs("[data-forum-online-count]")?.replaceChildren(document.createTextNode(String(Number(stats.online_count||0))));
    qs("[data-forum-member-count]")?.replaceChildren(document.createTextNode(String(Number(stats.member_count||0))));
    renderNodeTree();fillCategorySelect();renderTopics();
  };

  const openCreate=()=>{
    if(!state.user){window.location.href="./cabinet.html";return;}
    fillCategorySelect();
    const select=qs("#forum-category");
    if(!select?.options.length){showMessage("Нет доступного раздела для публикации.","error");return;}
    qs("[data-forum-modal]")?.showModal();
  };

  const createTopic=async()=>{
    const form=qs("[data-forum-form]"),button=qs("[data-forum-submit]");
    if(!state.user||!state.client||!form||!button||button.disabled)return;
    const data=new FormData(form),categoryId=Number(data.get("category_id")||0),title=String(data.get("title")||"").trim(),body=String(data.get("body")||"").trim();
    if(!categoryId||title.length<3||!body){showMessage("Заполни раздел, заголовок и сообщение.","error");return;}
    const node=state.nodes.find(n=>Number(n.id)===categoryId);
    if(!node||node.node_type!=="forum"){showMessage("Выбран недопустимый раздел.","error");return;}
    button.disabled=true;showMessage("");
    try {
      if(!(await syncAuthor())){showMessage("Не удалось сохранить форумный профиль. Проверь соединение и попробуй ещё раз.","error");return;}
      const r=await state.client.from("forum_topics").insert({category_id:categoryId,author_id:state.user.id,title,body}).select("id").single();
      if(r.error||!r.data?.id){showMessage("Не удалось создать тему. Проверь соединение и попробуй ещё раз.","error");return;}
      qs("[data-forum-modal]")?.close();form.reset();window.location.href="./topic.html?id="+encodeURIComponent(r.data.id);
    } catch (error) {
      console.error("[NaZerak Forum] topic creation failed:",error);
      showMessage("Не удалось создать тему из-за ошибки соединения. Попробуй ещё раз.","error");
    } finally {
      button.disabled=false;
    }
  };

  const init=async()=>{
    state.client=await waitForClient();
    if(!state.client){showMessage("Форум не смог подключиться к данным.","error");return;}
    try{const session=await withTimeout(state.client.auth.getSession(),8000,"");state.user=session.data?.session?.user||window.NaZerakAuth?.user||null;}catch{state.user=window.NaZerakAuth?.user||null;}
    if(state.user)await syncAuthor();
    qsa("[data-forum-create]").forEach(b=>b.addEventListener("click",openCreate));
    qs("[data-forum-submit]")?.addEventListener("click",createTopic);
    qs("#forum-search")?.addEventListener("input",e=>{state.search=String(e.target.value||"");qsa("[data-forum-search-clear],[data-forum-search-reset]").forEach(n=>n.hidden=!state.search.trim());renderTopics();});
    qs("[data-forum-search-clear]")?.addEventListener("click",()=>{state.search="";if(qs("#forum-search"))qs("#forum-search").value="";renderTopics();});
    qs("[data-forum-search-reset]")?.addEventListener("click",()=>{state.search="";if(qs("#forum-search"))qs("#forum-search").value="";renderTopics();});
    qs("[data-forum-search-form]")?.addEventListener("submit",e=>{e.preventDefault();const q=String(qs("#forum-search")?.value||"").trim();if(q)window.location.href="./forum-search.html?q="+encodeURIComponent(q);});
    document.addEventListener("keydown",e=>{if(e.key!=="/"||e.altKey||e.ctrlKey||e.metaKey)return;const target=e.target;if(target instanceof HTMLElement&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))return;const search=qs("#forum-search");if(!search)return;e.preventDefault();search.focus();search.select();});
    try{await loadData();}catch(e){showMessage(e instanceof Error?e.message:"Не удалось загрузить форум.","error");}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();