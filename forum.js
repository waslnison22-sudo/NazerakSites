(() => {
  "use strict";

  const state = { client:null, user:null, nodes:[], topics:[], permissions:null, search:"" };
  const qs=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl=(v)=>{try{const u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.href:"";}catch{return"";}};
  const setState=(label,kind)=>{const n=qs("[data-forum-state]");if(!n)return;n.dataset.state=kind||"";const t=qs("span",n);if(t)t.textContent=label;};
  const showMessage=(message,kind="info")=>{const n=qs("[data-forum-message]");if(!n)return;n.textContent=message;n.dataset.kind=kind;n.hidden=!message;};
  const formatDate=(value)=>{const d=new Date(value);if(Number.isNaN(d.getTime()))return"—";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(d);};
  const relative=(value)=>{const d=new Date(value);if(Number.isNaN(d.getTime()))return"—";const diff=Math.max(0,Date.now()-d.getTime());const m=Math.floor(diff/60000);if(m<1)return"только что";if(m<60)return m+" мин назад";const h=Math.floor(m/60);if(h<24)return h+" ч назад";const days=Math.floor(h/24);if(days<7)return days+" дн назад";return formatDate(value);};
  const userName=(user)=>{const m=user?.user_metadata||{};return String(m.global_name||m.full_name||m.name||m.user_name||m.preferred_username||"Игрок NaZerak").trim().slice(0,64)||"Игрок NaZerak";};
  const userAvatar=(user)=>{const m=user?.user_metadata||{};const url=safeUrl(m.avatar_url||m.picture);if(!url)return null;try{const host=new URL(url).hostname.toLowerCase();return host==="cdn.discordapp.com"||host==="media.discordapp.net"?url:null;}catch{return null;}};
  const waitForClient=async()=>{for(let i=0;i<100;i++){if(window.NaZerakAuth?.client)return window.NaZerakAuth.client;await new Promise(r=>setTimeout(r,100));}return null;};
  const loadData=async()=>{
    setState("ЗАГРУЗКА","loading");
    const requests=[
      state.client.from("forum_node_directory").select("id,slug,name,description,sort_order,icon,accent_color,area_slug,posting_mode,node_type,parent_id,route_slug,parent_slug,parent_name,topic_count,post_count").order("sort_order",{ascending:true}).order("id",{ascending:true}),
      state.client.from("forum_topic_list").select("id,slug,category_id,category_slug,category_route_slug,category_name,parent_name,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,title,body,is_pinned,is_locked,is_archived,prefix,views_count,solution_state,created_at,updated_at,last_post_at,reply_count").order("is_pinned",{ascending:false}).order("last_post_at",{ascending:false}).limit(100),
      state.client.from("forum_community_stats").select("member_count,online_count").maybeSingle()
    ];
    if(state.user) requests.push(state.client.from("forum_my_permissions").select("can_publish_official,can_moderate_forum,can_manage_roles,can_manage_categories").maybeSingle());
    const results=await Promise.all(requests);
    if(results[0].error)throw new Error(results[0].error.message||"Не удалось загрузить разделы форума.");
    if(results[1].error)throw new Error(results[1].error.message||"Не удалось загрузить темы форума.");
    if(results[2].error)console.warn("[NaZerak Forum] community stats unavailable:",results[2].error.message);
    state.nodes=results[0].data||[]; state.topics=results[1].data||[]; state.permissions=state.user?results[3]?.data||null:null;
    const stats=results[2].data||{member_count:0,online_count:0};
    qs("[data-forum-online-count]")?.replaceChildren(document.createTextNode(String(Number(stats.online_count||0))));
    qs("[data-forum-member-count]")?.replaceChildren(document.createTextNode(String(Number(stats.member_count||0))));
    renderNodeTree(); fillCategorySelect(); renderTopics(); setState("ФОРУМ ГОТОВ","ready");
  };
  const topicsFor=(id)=>state.topics.filter(t=>Number(t.category_id)===Number(id));
  const renderNodeTree=()=>{
    const root=qs("[data-forum-node-tree]");if(!root)return;
    const parents=state.nodes.filter(n=>n.node_type==="category");
    root.innerHTML=parents.map(parent=>{
      const children=state.nodes.filter(n=>n.node_type==="forum"&&Number(n.parent_id)===Number(parent.id));
      if(!children.length)return"";
      const body=children.map(node=>{
        const topics=topicsFor(node.id);
        const posts=topics.reduce((sum,t)=>sum+1+Number(t.reply_count||0),0);
        const latest=[...topics].sort((a,b)=>new Date(b.last_post_at).getTime()-new Date(a.last_post_at).getTime())[0];
        const latestHtml=latest
          ? '<a class="forum-board-row__last" href="./topic.html?id='+encodeURIComponent(latest.id)+'"><strong>'+escapeHtml(latest.title)+'</strong><span>'+escapeHtml(latest.author_name||"Игрок NaZerak")+' · '+relative(latest.last_post_at)+'</span></a>'
          : '<span class="forum-board-row__last forum-board-row__last--empty">Пока нет тем</span>';
        const mode=node.posting_mode==="official"?' <em class="forum-node-mode">Официальный</em>':"";
        return '<article class="forum-board-row">'+
          '<a class="forum-board-row__forum" href="./forum-category.html?slug='+encodeURIComponent(node.route_slug||node.slug)+'">'+
            '<span class="forum-category-card__icon">'+escapeHtml(node.icon||"•")+'</span>'+
            '<span><strong>'+escapeHtml(node.name)+mode+'</strong><small>'+escapeHtml(node.description||"Раздел форума")+'</small></span>'+
          '</a>'+
          '<span class="forum-board-row__stat">'+topics.length+'</span>'+
          '<span class="forum-board-row__stat">'+posts+'</span>'+latestHtml+
        '</article>';
      }).join("");
      return '<section class="forum-node-section">'+
        '<header class="forum-node-section__head"><div><span class="section-kicker">SECTION</span><h3>'+escapeHtml(parent.name)+'<span>.</span></h3><p>'+escapeHtml(parent.description||"")+'</p></div><span class="forum-node-section__count">'+children.length+' форумов</span></header>'+
        '<div class="forum-board__columns" aria-hidden="true"><span>Форум</span><span>Темы</span><span>Сообщения</span><span>Последнее сообщение</span></div>'+
        '<div class="forum-node-section__rows">'+body+'</div>'+
      '</section>';
    }).join("");
    const count=qs("[data-forum-board-count]");const n=state.nodes.filter(n=>n.node_type==="forum").length;
    if(count)count.textContent=n+" "+(n===1?"форум":n<5?"форума":"форумов");
  };
  const filteredTopics=()=>{const q=state.search.trim().toLowerCase();return q?state.topics.filter(t=>[t.title,t.body,t.category_name,t.author_name,t.parent_name].join(" ").toLowerCase().includes(q)):state.topics;};
  const renderTopics=()=>{
    const root=qs("[data-forum-topic-list]"),empty=qs("[data-forum-empty]");if(!root||!empty)return;
    const topics=filteredTopics();const noun=topics.length===1?"тема":topics.length<5?"темы":"тем";qs("[data-forum-result-count]")?.replaceChildren(document.createTextNode(topics.length+" "+noun));
    if(!topics.length){root.hidden=true;empty.hidden=false;return;}
    root.hidden=false;empty.hidden=true;
    root.innerHTML=topics.map(topic=>{
      const avatar=safeUrl(topic.author_avatar_url);const av=avatar?'<img src="'+escapeHtml(avatar)+'" alt="">':escapeHtml((topic.author_name||"N").slice(0,1).toUpperCase());
      const publicId=escapeHtml(topic.author_public_id||"");
      return '<article class="forum-topic-row'+(topic.is_pinned?" is-pinned":"")+'">'+
        '<a class="forum-topic-row__open" href="./topic.html?id='+encodeURIComponent(topic.id)+'"><div class="forum-topic-row__mark" aria-hidden="true">'+(topic.is_pinned?"★":"›")+'</div><div class="forum-topic-row__copy"><div class="forum-topic-row__tags"><span>'+escapeHtml(topic.category_name)+'</span>'+ (topic.prefix?'<span class="forum-topic-row__prefix">'+escapeHtml(topic.prefix)+'</span>':"") +(topic.is_locked?"<span>ЗАКРЫТО</span>":"")+'</div><h3>'+escapeHtml(topic.title)+'</h3><p>'+escapeHtml(String(topic.body||"").replace(/\s+/g," ").slice(0,160))+'</p></div></a>'+
        '<div class="forum-topic-row__footer"><a class="forum-user-link forum-role--'+escapeHtml(topic.primary_role_slug||"player")+'" data-forum-user="'+publicId+'" href="./forum-user.html?id='+publicId+'"><span class="forum-avatar forum-avatar--small">'+av+'</span><span>'+escapeHtml(topic.author_name||"Игрок NaZerak")+'</span><span class="forum-user-link__role">'+escapeHtml(topic.primary_role_badge||"•")+" "+escapeHtml(topic.primary_role_name||"Игрок")+'</span></a><span>'+relative(topic.last_post_at)+' · '+Number(topic.reply_count||0)+' ответов</span></div>'+
      '</article>';
    }).join("");
  };
  const fillCategorySelect=()=>{
    const select=qs("#forum-category");if(!select)return;
    const open=state.nodes.filter(n=>n.node_type==="forum"&&(n.posting_mode==="open"||state.permissions?.can_publish_official));
    select.innerHTML=open.map(n=>'<option value="'+escapeHtml(n.id)+'">'+escapeHtml(n.parent_name?n.parent_name+" — ":"")+escapeHtml(n.name)+(n.posting_mode==="official"?" · официальное":"")+'</option>').join("");
    const parentOpen=open.length>0;qs("[data-forum-submit]")?.toggleAttribute("disabled",!parentOpen);
  };
  const openCreate=()=>{if(!state.user){location.href="./cabinet.html";return;}if(!state.nodes.length){showMessage("Сначала добавим раздел форума.","error");return;}const modal=qs("[data-forum-modal]");if(!modal)return;fillCategorySelect();modal.showModal();};
  const createTopic=async()=>{
    const form=qs("[data-forum-form]"),button=qs("[data-forum-submit]");if(!state.user||!state.client||!form)return;
    const data=new FormData(form);const categoryId=Number(data.get("category_id")||0);const title=String(data.get("title")||"").trim();const body=String(data.get("body")||"").trim();
    if(!categoryId||title.length<3||!body){showMessage("Заполни раздел, заголовок и сообщение.","error");return;}
    const node=state.nodes.find(n=>Number(n.id)===categoryId);if(!node||node.node_type!=="forum"){showMessage("Выбран недопустимый раздел.","error");return;}
    button.disabled=true;
    const sync=await state.client.from("forum_authors").upsert({id:state.user.id,display_name:userName(state.user),avatar_url:userAvatar(state.user)||null,last_seen_at:new Date().toISOString()},{onConflict:"id"});
    if(sync.error)console.warn("[NaZerak Forum] author sync:",sync.error.message);
    const r=await state.client.from("forum_topics").insert({category_id:categoryId,author_id:state.user.id,title,body}).select("id").single();
    button.disabled=false;
    if(r.error){showMessage(r.error.message||"Не удалось создать тему.","error");return;}
    location.href="./topic.html?id="+encodeURIComponent(r.data.id);
  };
  const init=async()=>{
    state.client=await waitForClient();if(!state.client){setState("OFFLINE","error");showMessage("Не удалось подключиться к форуму.","error");return;}
    state.user=(await state.client.auth.getSession()).data?.session?.user||window.NaZerakAuth?.user||null;
    qs("[data-forum-create]")?.addEventListener("click",openCreate);
    qs("[data-forum-submit]")?.addEventListener("click",createTopic);
    qs("[data-forum-search-form]")?.addEventListener("submit",e=>{e.preventDefault();state.search=String(qs("#forum-search")?.value||"");renderTopics();});
    qs("[data-forum-search-clear]")?.addEventListener("click",()=>{qs("#forum-search").value="";state.search="";renderTopics();});
    qs("[data-forum-search-reset]")?.addEventListener("click",()=>{qs("#forum-search").value="";state.search="";renderTopics();});
    try{await loadData();}catch(e){setState("ОШИБКА","error");showMessage(e instanceof Error?e.message:"Не удалось загрузить форум.","error");}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();