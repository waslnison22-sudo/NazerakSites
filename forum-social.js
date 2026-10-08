(() => {
  "use strict";
  const qs=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const relative=v=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return"—";const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(m<1)return"только что";if(m<60)return m+" мин назад";const h=Math.floor(m/60);if(h<24)return h+" ч назад";const day=Math.floor(h/24);if(day<7)return day+" дн назад";return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short"}).format(d)};
  const timeout=async(p,ms)=>{let t;try{return await Promise.race([p,new Promise((_,r)=>t=setTimeout(()=>r(new Error("timeout")),ms))])}finally{clearTimeout(t)}};
  let popover=null;
  const close=()=>{if(popover){popover.remove();popover=null}};
  const position=(button)=>{if(!popover)return;const r=button.getBoundingClientRect(),w=Math.min(390,innerWidth-24);popover.style.width=w+"px";popover.style.top=Math.min(innerHeight-12-popover.offsetHeight,Math.max(12,r.bottom+10))+"px";popover.style.left=Math.max(12,Math.min(r.right-w,innerWidth-w-12))+"px"};
  const render=async()=>{
    const root=qs("[data-forum-notifications]");if(!root)return;
    const client=window.NaZerakAuth?.client,user=window.NaZerakAuth?.user;
    if(!client||!user){root.hidden=true;return}
    root.hidden=false;
    let rows=[];
    try{
      const r=await timeout(client.from("forum_notifications").select("id,topic_id,post_id,type,title,body,is_read,created_at").order("created_at",{ascending:false}).limit(12),5000);
      if(r.error)throw r.error;rows=r.data||[];
    }catch(e){console.warn("[NaZerak Forum] notifications:",e?.message||e);return}
    const unread=rows.filter(x=>!x.is_read).length;
    root.innerHTML='<button class="forum-notification-trigger" type="button" aria-label="Уведомления" aria-expanded="false">◌'+(unread?'<span class="forum-notification-trigger__badge">'+(unread>9?"9+":unread)+'</span>':"")+'</button>';
    const button=root.firstElementChild;
    button.addEventListener("click",()=>{
      if(popover){close();button.setAttribute("aria-expanded","false");return}
      popover=document.createElement("div");popover.className="forum-notifications-popover";
      popover.innerHTML='<div class="forum-notifications-popover__head"><strong>Уведомления</strong><button type="button" data-mark-all>Отметить прочитанными</button></div>'+
        (rows.length?rows.map(n=>'<a class="forum-notification-item'+(!n.is_read?" is-unread":"")+'" href="/forum/topic/'+encodeURIComponent(n.topic_id||"")+'" data-notification-id="'+esc(n.id)+'"><strong>'+esc(n.title)+'</strong><span>'+esc(n.body||"")+'</span><time>'+relative(n.created_at)+'</time></a>').join(""):'<div class="forum-notifications-empty">Новых уведомлений нет.</div>');
      document.body.appendChild(popover);button.setAttribute("aria-expanded","true");position(button);
      popover.addEventListener("click",async e=>{
        const mark=e.target.closest("[data-mark-all]");
        if(mark){e.preventDefault();await client.from("forum_notifications").update({is_read:true}).eq("user_id",user.id).eq("is_read",false);close();await render();return}
        const item=e.target.closest("[data-notification-id]");
        if(item){const id=Number(item.dataset.notificationId);if(id)await client.from("forum_notifications").update({is_read:true}).eq("id",id).eq("user_id",user.id)}
      });
    });
  };
  document.addEventListener("click",e=>{if(popover&&!popover.contains(e.target)&&!e.target.closest("[data-forum-notifications]"))close()});
  addEventListener("resize",()=>{const b=qs("[data-forum-notifications] .forum-notification-trigger");if(popover&&b)position(b)});
  addEventListener("scroll",close,{passive:true});
  const init=async()=>{if(window.NaZerakAuth?.ready)await window.NaZerakAuth.ready;await render()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
  window.NaZerakForumSocial=Object.freeze({refresh:render,close});
})();