(() => {
  "use strict";
  const state={client:null,user:null,topic:null};
  const qs=(s,r=document)=>r.querySelector(s);
  const escapeHtml=(v)=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const safeUrl=(v)=>{try{const u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.href:"";}catch{return"";}};
  const formatDateTime=(v)=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return"—";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);};
  const userName=(u)=>{const m=u&&u.user_metadata||{};return String(m.global_name||m.full_name||m.name||m.user_name||"Игрок NaZerak").trim().slice(0,64)||"Игрок NaZerak";};
  const userAvatar=(u)=>safeUrl(u&&u.user_metadata&&(u.user_metadata.avatar_url||u.user_metadata.picture));
  const showMessage=(m,k)=>{const n=qs("[data-topic-message]");if(!n)return;n.textContent=m;n.dataset.kind=k||"info";n.hidden=!m;};
  const withTimeout=async(promise,ms,message)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(new Error(message)),ms);})]);}finally{window.clearTimeout(timer);}};
  const waitForClient=async()=>{for(let i=0;i<100;i+=1){const c=window.NaZerakAuth&&window.NaZerakAuth.client;if(c)return c;await new Promise(r=>window.setTimeout(r,100));}return null;};
  const syncAuthor=async()=>{if(!state.client||!state.user)return false;const r=await state.client.from("forum_authors").upsert({id:state.user.id,display_name:userName(state.user),avatar_url:userAvatar(state.user)||null,updated_at:new Date().toISOString(),last_seen_at:new Date().toISOString()},{onConflict:"id"});return !r.error;};
  const loadTopic=async()=>{
    const pathMatch=window.location.pathname.match(/^\/forum\/topic\/([^/]+)\/?$/i); const id=Number(decodeURIComponent(pathMatch?.[1]||new URLSearchParams(window.location.search).get("id")||""));
    if(!Number.isSafeInteger(id)||id<1)throw new Error("Некорректная тема форума.");
    const results=await withTimeout(Promise.all([
      state.client.from("forum_topic_detail").select("id,slug,category_id,category_slug,category_route_slug,category_name,parent_name,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,title,body,is_pinned,is_locked,is_archived,prefix,views_count,solution_state,created_at,updated_at,last_post_at,reply_count").eq("id",id).maybeSingle(),
      state.client.from("forum_posts").select("id,topic_id,body,created_at,updated_at,edited_at,author_public_id,author_display_name,author_avatar_url,author_role_slug,author_role_name,author_role_badge").eq("topic_id",id).order("created_at",{ascending:true})
    ]),10000,"Загрузка темы превысила 10 секунд. Попробуй обновить страницу.");
    if(results[0].error)throw new Error(results[0].error.message);
    if(!results[0].data)throw new Error("Тема не найдена или была удалена.");
    if(results[1].error)throw new Error(results[1].error.message);
    state.topic=results[0].data;
    renderTopic(results[0].data,results[1].data||[]);
  };
  const authorMarkup=(publicId,name,roleSlug)=>publicId
    ? '<a class="topic-post__author-link forum-role--'+escapeHtml(roleSlug||"player")+'" data-forum-user="'+escapeHtml(publicId)+'" href="/user/'+encodeURIComponent(publicId)+'">'+escapeHtml(name||"Игрок NaZerak")+'</a>'
    : escapeHtml(name||"Игрок NaZerak");
  const renderTopic=(topic,posts)=>{
    const avatar=safeUrl(topic.author_avatar_url);
    const categoryLink=qs("[data-topic-category-link]");
    if(categoryLink){categoryLink.textContent=topic.parent_name ? topic.parent_name+" / "+(topic.category_name||"Форум") : (topic.category_name||"Форум");categoryLink.href="/forum/"+encodeURIComponent(topic.category_route_slug||topic.category_slug||"");}
    qs("[data-topic-category-badge]").textContent=topic.category_name||"Форум";
    qs("[data-topic-title]").textContent=topic.title;
    qs("[data-topic-date]").textContent=formatDateTime(topic.created_at);
    qs("[data-topic-author]").textContent=topic.author_name||"Игрок NaZerak";
    const img=qs("[data-topic-author-avatar]");img.hidden=!avatar;if(avatar){img.src=avatar;img.alt="";}
    qs("[data-topic-author-initial]").textContent=(topic.author_name||"N").slice(0,1).toUpperCase();
    const root=qs("[data-topic-posts]");
    const opener={body:topic.body,created_at:topic.created_at,author_public_id:topic.author_public_id,author_display_name:topic.author_name,author_avatar_url:topic.author_avatar_url,author_role_slug:topic.primary_role_slug,author_role_name:topic.primary_role_name,author_role_badge:topic.primary_role_badge};
    const items=[opener].concat(posts||[]);
    root.innerHTML=items.map((item,index)=>{
      const av=safeUrl(item.author_avatar_url),initial=escapeHtml((item.author_display_name||"N").slice(0,1).toUpperCase());
      const media=av?'<img src="'+escapeHtml(av)+'" alt="">':initial;
      return '<article class="topic-post'+(index===0?" topic-post--opener":"")+'"><aside class="topic-post__author"><div class="forum-avatar">'+media+'</div><strong>'+authorMarkup(item.author_public_id,item.author_display_name,item.author_role_slug)+'</strong><span>'+escapeHtml(index===0?"Автор темы":item.author_role_name||"Игрок")+'</span></aside><div class="topic-post__body"><header><span>'+escapeHtml(index===0?"ПЕРВОЕ СООБЩЕНИЕ":"ОТВЕТ #"+index)+'</span><time datetime="'+escapeHtml(item.created_at)+'">'+formatDateTime(item.created_at)+'</time></header><div>'+escapeHtml(item.body).replace(/\n/g,"<br>")+'</div></div></article>';
    }).join("");
    qs("[data-topic-reply]").hidden=!state.user||topic.is_locked||topic.is_archived;
    qs("[data-topic-login]").hidden=!!state.user||topic.is_locked||topic.is_archived;
    if(topic.is_locked||topic.is_archived)qs("[data-topic-lock-note]").textContent=topic.is_archived?"Тема находится в архиве.":"Тема закрыта, новые ответы недоступны.";
    document.title="NaZerak — "+topic.title;
  };
  const reply=async()=>{
    const input=qs("[data-topic-reply-input]"),button=qs("[data-topic-reply-submit]"),body=String(input&&input.value||"").trim();
    if(!state.user||!state.client||!state.topic||button.disabled)return;
    if(!body){showMessage("Напиши текст ответа.","error");return;}
    button.disabled=true;const buttonLabel=button.querySelector("span");if(buttonLabel)buttonLabel.textContent="Публикуем…";showMessage("");
    try {
      if(!(await syncAuthor())){showMessage("Не удалось сохранить форумный профиль. Проверь соединение и попробуй ещё раз.","error");return;}
      const r=await state.client.from("forum_posts").insert({topic_id:state.topic.id,author_id:state.user.id,body:body});
      if(r.error){showMessage("Не удалось опубликовать ответ. Проверь соединение и попробуй ещё раз.","error");return;}
      input.value="";await loadTopic();window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
    } catch (error) {
      console.error("[NaZerak Forum] reply failed:",error);
      showMessage("Не удалось опубликовать ответ из-за ошибки соединения. Попробуй ещё раз.","error");
    } finally {
      button.disabled=false;if(buttonLabel)buttonLabel.textContent="Ответить";
    }
  };
  const init=async()=>{
    state.client=await waitForClient();
    if(!state.client){showMessage("Форум не смог подключиться к базе данных.","error");return;}
    let session=null;try{session=await withTimeout(state.client.auth.getSession(),8000,"");}catch{}
    state.user=session.data&&session.data.session&&session.data.session.user||null;
    if(state.user)await syncAuthor();
    qs("[data-topic-reply-submit]")&&qs("[data-topic-reply-submit]").addEventListener("click",reply);
    try{await loadTopic();}catch(e){qs("[data-topic-head]").hidden=true;showMessage(e instanceof Error?e.message:"Не удалось загрузить тему.","error");}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();