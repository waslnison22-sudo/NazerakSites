(() => {
  "use strict";
  const state={client:null,user:null,myPublicId:null,topic:null,posts:[],permissions:null,reactions:[],ownReactions:new Map(),bookmarked:false,watching:false};
  const qs=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.href:""}catch{return""}};
  const timeout=async(p,ms,msg)=>{let t;try{return await Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(msg)),ms)})])}finally{clearTimeout(t)}};
  const userName=u=>{const m=u?.user_metadata||{};return String(m.global_name||m.full_name||m.name||m.user_name||m.preferred_username||"Игрок NaZerak").trim().slice(0,64)||"Игрок NaZerak"};
  const userAvatar=u=>safeUrl(u?.user_metadata?.avatar_url||u?.user_metadata?.picture);
  const message=(m,k="info")=>{const n=qs("[data-topic-message]");if(!n)return;n.textContent=m;n.dataset.kind=k;n.hidden=!m};
  const idFromUrl=()=>{const m=location.pathname.match(/^\/forum\/topic\/([^/]+)\/?$/i);return Number(decodeURIComponent(m?.[1]||new URLSearchParams(location.search).get("id")||""))};
  const canManage=()=>Boolean(state.permissions?.can_moderate_forum);
  const isOwnTopic=()=>Boolean(state.myPublicId&&state.topic?.author_public_id===state.myPublicId);
  const isOwnPost=p=>Boolean(state.myPublicId&&p?.author_public_id===state.myPublicId);
  const reactionNames={like:"👍",helpful:"💡",love:"❤️",wow:"😮",sad:"😔"};
  const reactionCounts=postId=>state.reactions.filter(r=>Number(r.post_id)===Number(postId));
  const ownReaction=postId=>state.ownReactions.get(Number(postId))||"";

  const syncAuthor=async()=>{if(!state.client||!state.user)return false;const r=await state.client.from("forum_authors").upsert({id:state.user.id,display_name:userName(state.user),avatar_url:userAvatar(state.user)||null,updated_at:new Date().toISOString(),last_seen_at:new Date().toISOString()},{onConflict:"id"});return !r.error};
  const loadIdentity=async()=>{try{const r=await timeout(state.client.from("forum_authors").select("public_id").eq("id",state.user.id).maybeSingle(),5000,"");if(!r.error)state.myPublicId=r.data?.public_id||null}catch{}};

  const loadSocial=async(postIds)=>{
    state.reactions=[];state.ownReactions=new Map();state.bookmarked=false;state.watching=false;
    const req=[];
    if(postIds.length)req.push(state.client.from("forum_post_reaction_summary").select("post_id,reaction,reaction_count").in("post_id",postIds));
    else req.push(Promise.resolve({data:[],error:null}));
    if(state.user){
      if(postIds.length)req.push(state.client.from("forum_post_reactions").select("post_id,reaction").in("post_id",postIds));
      else req.push(Promise.resolve({data:[],error:null}));
      req.push(state.client.from("forum_topic_bookmarks").select("topic_id").eq("topic_id",state.topic.id).eq("user_id",state.user.id).maybeSingle());
      req.push(state.client.from("forum_topic_watchers").select("topic_id").eq("topic_id",state.topic.id).eq("user_id",state.user.id).maybeSingle());
    }
    const res=await timeout(Promise.all(req),7000,"Загрузка социальных функций превысила 7 секунд.");
    state.reactions=res[0]?.data||[];
    if(state.user){
      (res[1]?.data||[]).forEach(x=>state.ownReactions.set(Number(x.post_id),x.reaction));
      state.bookmarked=Boolean(res[2]?.data);state.watching=Boolean(res[3]?.data);
    }
  };

  const loadTopic=async()=>{
    const id=idFromUrl();if(!Number.isSafeInteger(id)||id<1)throw new Error("Некорректная тема форума.");
    const requests=[
      state.client.from("forum_topic_detail").select("id,slug,category_id,category_slug,category_route_slug,category_name,parent_name,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,title,body,is_pinned,is_locked,is_archived,prefix,views_count,solution_state,created_at,updated_at,last_post_at,reply_count").eq("id",id).maybeSingle(),
      state.client.from("forum_posts").select("id,topic_id,body,created_at,updated_at,edited_at,author_public_id,author_display_name,author_avatar_url,author_role_slug,author_role_name,author_role_badge").eq("topic_id",id).order("created_at",{ascending:true})
    ];
    if(state.user)requests.push(state.client.from("forum_my_permissions").select("can_publish_official,can_moderate_forum,can_manage_roles,can_manage_categories").maybeSingle());
    const res=await timeout(Promise.all(requests),10000,"Загрузка темы превысила 10 секунд. Попробуй обновить страницу.");
    if(res[0].error)throw new Error(res[0].error.message||"Не удалось загрузить тему.");
    if(!res[0].data)throw new Error("Тема не найдена или была удалена.");
    if(res[1].error)throw new Error(res[1].error.message||"Не удалось загрузить сообщения.");
    state.topic=res[0].data;state.posts=res[1].data||[];state.permissions=res[2]?.data||null;
    await loadSocial(state.posts.map(p=>Number(p.id)));
    render();
  };

  const authorMarkup=(publicId,name,roleSlug)=>publicId
    ? '<a class="topic-post__author-link forum-role--'+esc(roleSlug||"player")+'" data-forum-user="'+esc(publicId)+'" href="/user/'+encodeURIComponent(publicId)+'">'+esc(name||"Игрок NaZerak")+'</a>'
    : esc(name||"Игрок NaZerak");

  const renderActions=()=>{
    const root=qs("[data-topic-actions]");if(!root)return;
    const editable=isOwnTopic()||canManage();
    root.hidden=!editable&&!canManage();
    const edit=qs("[data-topic-edit]"),pin=qs("[data-topic-pin]"),lock=qs("[data-topic-lock]"),archive=qs("[data-topic-archive]"),del=qs("[data-topic-delete]");
    if(edit)edit.hidden=!editable;if(pin)pin.hidden=!canManage();if(lock)lock.hidden=!canManage();if(archive)archive.hidden=!canManage();if(del)del.hidden=!editable;
    if(pin)pin.textContent=state.topic.is_pinned?"Открепить":"Закрепить";
    if(lock)lock.textContent=state.topic.is_locked?"Открыть":"Закрыть";
    if(archive)archive.textContent=state.topic.is_archived?"Разархивировать":"Архивировать";
  };

  const renderSocialBar=()=>{
    const root=qs("[data-topic-social]");if(!root)return;
    const watch=qs("[data-topic-watch]",root),bookmark=qs("[data-topic-bookmark]",root),report=qs("[data-topic-report]",root);
    if(!state.user){root.hidden=true;return}
    root.hidden=false;watch.hidden=false;bookmark.hidden=false;report.hidden=false;
    watch.textContent=state.watching?"Не отслеживать":"Отслеживать";
    bookmark.textContent=state.bookmarked?"Удалить из сохранённых":"Сохранить";
  };

  const postSocialMarkup=(item,index)=>{
    if(index===0)return "";
    const counts=reactionCounts(item.id);
    const buttons=["like","helpful","love","wow","sad"].map(type=>{
      const row=counts.find(x=>x.reaction===type);const count=Number(row?.reaction_count||0);const active=ownReaction(item.id)===type;
      return '<button class="topic-reaction'+(active?" is-active":"")+'" type="button" data-reaction="'+type+'" data-post-id="'+esc(item.id)+'" aria-pressed="'+active+'">'+reactionNames[type]+(count?" <strong>"+count+"</strong>":"")+'</button>';
    }).join("");
    const quote='<button class="topic-post__report" type="button" data-quote-post="'+esc(item.id)+'">Цитировать</button>';
    const report=state.user?'<button class="topic-post__report" type="button" data-report-post="'+esc(item.id)+'">Пожаловаться</button>':"";
    return '<div class="topic-post__social">'+buttons+quote+report+'</div>';
  };

  const render=()=>{
    const topic=state.topic,posts=state.posts;
    const cat=qs("[data-topic-category-link]");
    if(cat){cat.textContent=topic.parent_name?topic.parent_name+" / "+(topic.category_name||"Форум"):(topic.category_name||"Форум");cat.href="/forum/"+encodeURIComponent(topic.category_route_slug||topic.category_slug||"")}
    qs("[data-topic-category-badge]").textContent=topic.category_name||"Форум";
    qs("[data-topic-title]").textContent=topic.title;
    qs("[data-topic-date]").textContent=new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(topic.created_at));
    qs("[data-topic-author]").textContent=topic.author_name||"Игрок NaZerak";
    const img=qs("[data-topic-author-avatar]"),avatar=safeUrl(topic.author_avatar_url);img.hidden=!avatar;if(avatar)img.src=avatar;
    qs("[data-topic-author-initial]").textContent=(topic.author_name||"N").slice(0,1).toUpperCase();
    renderActions();renderSocialBar();
    const root=qs("[data-topic-posts]");
    const opener={id:null,body:topic.body,created_at:topic.created_at,updated_at:topic.updated_at,edited_at:null,author_public_id:topic.author_public_id,author_display_name:topic.author_name,author_avatar_url:topic.author_avatar_url,author_role_slug:topic.primary_role_slug,author_role_name:topic.primary_role_name,author_role_badge:topic.primary_role_badge};
    root.innerHTML=[opener,...posts].map((item,index)=>{
      const av=safeUrl(item.author_avatar_url),media=av?'<img src="'+esc(av)+'" alt="">':esc((item.author_display_name||"N").slice(0,1).toUpperCase());
      const editable=isOwnPost(item)||(index===0&&(isOwnTopic()||canManage()));
      const actions=editable?'<div class="topic-post__actions"><button type="button" data-post-edit data-post-id="'+esc(item.id||"topic")+'" data-post-index="'+index+'">Изменить</button><button type="button" class="danger" data-post-delete data-post-id="'+esc(item.id||"topic")+'" data-post-index="'+index+'">Удалить</button></div>':"";
      const edited=item.edited_at?'<span aria-label="сообщение изменено">изменено</span>':"";
      return '<article class="topic-post'+(index===0?" topic-post--opener":"")+'"><aside class="topic-post__author"><div class="forum-avatar">'+media+'</div><strong>'+authorMarkup(item.author_public_id,item.author_display_name,item.author_role_slug)+'</strong><span>'+esc(index===0?"Автор темы":item.author_role_name||"Игрок")+'</span></aside><div class="topic-post__body"><header><span>'+esc(index===0?"ПЕРВОЕ СООБЩЕНИЕ":"ОТВЕТ #"+index)+'</span><time datetime="'+esc(item.created_at)+'">'+esc(new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(item.created_at)))+'</time>'+edited+'</header><div>'+esc(item.body).replace(/\n/g,"<br>")+'</div>'+actions+postSocialMarkup(item,index)+'</div></article>';
    }).join("");
    qs("[data-topic-reply]").hidden=!state.user||topic.is_locked||topic.is_archived;
    qs("[data-topic-login]").hidden=!!state.user||topic.is_locked||topic.is_archived;
    const note=qs("[data-topic-lock-note]");if(note)note.textContent=topic.is_archived?"Тема находится в архиве.":topic.is_locked?"Тема закрыта, новые ответы недоступны.":"";
    document.title="NaZerak — "+topic.title;
  };

  const editTopic=async()=>{
    const form=qs("[data-topic-edit-form]"),button=qs("[data-topic-edit-submit]");if(!form||!button)return;
    qs("#topic-edit-title-input").value=state.topic.title;qs("#topic-edit-body-input").value=state.topic.body;const modal=qs("[data-topic-edit-modal]");modal.showModal();
    button.onclick=async()=>{const title=qs("#topic-edit-title-input").value.trim(),body=qs("#topic-edit-body-input").value.trim();if(title.length<3||!body){message("Заголовок и сообщение обязательны.","error");return}button.disabled=true;const r=await state.client.from("forum_topics").update({title,body,updated_at:new Date().toISOString()}).eq("id",state.topic.id);button.disabled=false;if(r.error){message("Не удалось сохранить тему. Проверь права и соединение.","error");return}modal.close();message("Тема сохранена.","success");await loadTopic()};
  };
  const editPost=async(postId,index)=>{
    const item=index===0?{id:"topic",body:state.topic.body}:state.posts.find(p=>String(p.id)===String(postId));if(!item)return;
    const modal=qs("[data-post-edit-modal]"),input=qs("#post-edit-body-input"),button=qs("[data-post-edit-submit]");input.value=item.body;modal.showModal();
    button.onclick=async()=>{const body=input.value.trim();if(!body){message("Сообщение не может быть пустым.","error");return}button.disabled=true;let r;if(index===0)r=await state.client.from("forum_topics").update({body,updated_at:new Date().toISOString()}).eq("id",state.topic.id);else r=await state.client.from("forum_posts").update({body,updated_at:new Date().toISOString(),edited_at:new Date().toISOString()}).eq("id",item.id);button.disabled=false;if(r.error){message("Не удалось сохранить сообщение. Проверь права и соединение.","error");return}modal.close();message("Изменения сохранены.","success");await loadTopic()};
  };
  const deletePost=async(postId,index)=>{
    if(!confirm(index===0?"Удалить первое сообщение? Это действие удалит тему и ответы.":"Удалить это сообщение?"))return;
    const r=index===0?await state.client.from("forum_topics").delete().eq("id",state.topic.id):await state.client.from("forum_posts").delete().eq("id",postId);
    if(r.error){message("Не удалось удалить. Проверь права и соединение.","error");return}
    if(index===0)location.href="/forum/"+encodeURIComponent(state.topic.category_route_slug||state.topic.category_slug||"");else{message("Сообщение удалено.","success");await loadTopic()}
  };
  const toggleTopic=async(field,label)=>{
    const map={is_pinned:["pin","unpin"],is_locked:["lock","unlock"],is_archived:["archive","unarchive"]},pair=map[field];if(!pair)return;
    const action=state.topic[field]?pair[1]:pair[0];const r=await state.client.rpc("forum_moderate_topic",{p_topic_id:state.topic.id,p_action:action});
    if(r.error){message("Не удалось изменить состояние темы. Проверь права модератора и подключение.","error");return}message(label+" обновлено.","success");await loadTopic();
  };
  const toggleBookmark=async()=>{
    if(!state.user)return;
    const r=state.bookmarked?await state.client.from("forum_topic_bookmarks").delete().eq("topic_id",state.topic.id).eq("user_id",state.user.id):await state.client.from("forum_topic_bookmarks").insert({topic_id:state.topic.id,user_id:state.user.id});
    if(r.error){message("Не удалось изменить сохранение темы.","error");return}state.bookmarked=!state.bookmarked;renderSocialBar();
  };
  const toggleWatch=async()=>{
    if(!state.user)return;
    const r=state.watching?await state.client.from("forum_topic_watchers").delete().eq("topic_id",state.topic.id).eq("user_id",state.user.id):await state.client.from("forum_topic_watchers").insert({topic_id:state.topic.id,user_id:state.user.id});
    if(r.error){message("Не удалось изменить подписку на тему.","error");return}state.watching=!state.watching;renderSocialBar();
  };
  const toggleReaction=async(postId,reaction)=>{
    if(!state.user)return;
    const current=ownReaction(postId);let r;
    if(current===reaction)r=await state.client.from("forum_post_reactions").delete().eq("post_id",postId).eq("user_id",state.user.id);
    else if(current)r=await state.client.from("forum_post_reactions").update({reaction}).eq("post_id",postId).eq("user_id",state.user.id);
    else r=await state.client.from("forum_post_reactions").insert({post_id:postId,user_id:state.user.id,reaction});
    if(r.error){message("Не удалось сохранить реакцию. Попробуй ещё раз.","error");return}
    await loadTopic();
  };
  const openReport=(topicId,postId)=>{
    if(!state.user)return;
    const modal=qs("[data-topic-report-modal]"),form=qs("[data-topic-report-form]"),input=qs("#topic-report-reason");if(!modal||!form||!input)return;
    form.dataset.topicId=topicId?"":"";form.dataset.topicId=topicId||"";form.dataset.postId=postId||"";input.value="";modal.showModal();
  };
  const submitReport=async()=>{
    const form=qs("[data-topic-report-form]"),input=qs("#topic-report-reason"),button=qs("[data-topic-report-submit]");const reason=input.value.trim();
    if(reason.length<5){message("Опиши причину минимум в 5 символах.","error");return}
    button.disabled=true;const payload={reporter_id:state.user.id,reason};if(form.dataset.postId)payload.post_id=Number(form.dataset.postId);else payload.topic_id=state.topic.id;
    const r=await state.client.from("forum_reports").insert(payload);button.disabled=false;
    if(r.error){message("Не удалось отправить жалобу. Попробуй ещё раз.","error");return}
    qs("[data-topic-report-modal]")?.close();message("Жалоба отправлена модераторам.","success");
  };
  const quotePost=postId=>{
    const post=state.posts.find(p=>Number(p.id)===Number(postId));if(!post)return;
    const input=qs("[data-topic-reply-input]");if(!input)return;
    const text=String(post.body||"").split("\n").map(line=>"> "+line).join("\n");
    input.value=(input.value.trim()?input.value.trim()+"\n\n":"")+"@"+(post.author_display_name||"Игрок")+"\n"+text+"\n\n";input.focus();input.scrollIntoView({behavior:"smooth",block:"center"});
  };
  const reply=async()=>{
    const input=qs("[data-topic-reply-input]"),button=qs("[data-topic-reply-submit]"),body=String(input?.value||"").trim();if(!state.user||!state.client||!state.topic||button.disabled)return;
    if(!body){message("Напиши текст ответа.","error");return}button.disabled=true;const label=button.querySelector("span");if(label)label.textContent="Публикуем…";
    try{if(!(await syncAuthor())){message("Не удалось сохранить форумный профиль.","error");return}const r=await state.client.from("forum_posts").insert({topic_id:state.topic.id,author_id:state.user.id,body});if(r.error){message("Не удалось опубликовать ответ. Проверь соединение и права.","error");return}input.value="";message("Ответ опубликован.","success");await loadTopic();window.NaZerakForumSocial?.refresh();window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"})}finally{button.disabled=false;if(label)label.textContent="Ответить"}
  };
  const bind=()=>{
    qs("[data-topic-edit]")?.addEventListener("click",editTopic);
    qs("[data-topic-delete]")?.addEventListener("click",()=>deletePost("topic",0));
    qs("[data-topic-pin]")?.addEventListener("click",()=>toggleTopic("is_pinned","Закрепление"));
    qs("[data-topic-lock]")?.addEventListener("click",()=>toggleTopic("is_locked","Блокировка"));
    qs("[data-topic-archive]")?.addEventListener("click",()=>toggleTopic("is_archived","Архив"));
    qs("[data-topic-watch]")?.addEventListener("click",toggleWatch);
    qs("[data-topic-bookmark]")?.addEventListener("click",toggleBookmark);
    qs("[data-topic-report]")?.addEventListener("click",()=>openReport(state.topic.id,null));
    qs("[data-topic-report-submit]")?.addEventListener("click",submitReport);
    qs("[data-topic-reply-submit]")?.addEventListener("click",reply);
    qs("[data-topic-posts]")?.addEventListener("click",e=>{
      const edit=e.target.closest("[data-post-edit]"),del=e.target.closest("[data-post-delete]"),react=e.target.closest("[data-reaction]"),quote=e.target.closest("[data-quote-post]"),report=e.target.closest("[data-report-post]");
      if(edit)void editPost(edit.dataset.postId,Number(edit.dataset.postIndex));
      if(del)void deletePost(del.dataset.postId,Number(del.dataset.postIndex));
      if(react)void toggleReaction(Number(react.dataset.postId),react.dataset.reaction);
      if(quote)quotePost(Number(quote.dataset.quotePost));
      if(report)openReport(null,Number(report.dataset.reportPost));
    });
  };
  const init=async()=>{
    if(window.NaZerakAuth?.ready)await window.NaZerakAuth.ready;
    state.client=window.NaZerakAuth?.client||null;state.user=window.NaZerakAuth?.user||null;
    if(!state.client){message("Форум не смог подключиться к базе данных.","error");return}
    if(state.user){await syncAuthor();await loadIdentity()}
    try{await loadTopic();bind()}catch(e){qs("[data-topic-head]").hidden=true;message(e instanceof Error?e.message:"Не удалось загрузить тему.","error")}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();