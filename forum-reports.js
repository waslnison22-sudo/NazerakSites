(() => {
"use strict";
const qs=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const relative=v=>{const d=new Date(v),m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(!Number.isFinite(m))return"—";if(m<1)return"только что";if(m<60)return m+" мин назад";const h=Math.floor(m/60);if(h<24)return h+" ч назад";return Math.floor(h/24)+" дн назад"};
const message=(m,k="info")=>{const n=qs("[data-reports-message]");n.textContent=m;n.dataset.kind=k};
const init=async()=>{
  if(window.NaZerakAuth?.ready)await window.NaZerakAuth.ready;
  const client=window.NaZerakAuth?.client,user=window.NaZerakAuth?.user;
  if(!client||!user){message("Для центра модерации требуется вход в аккаунт.","error");return}
  const p=await client.from("forum_my_permissions").select("can_moderate_forum").maybeSingle();
  if(p.error||!p.data?.can_moderate_forum){message("Недостаточно прав: раздел доступен только модераторам.","error");return}
  const root=qs("[data-reports-list]");root.hidden=false;
  const load=async()=>{
    const r=await client.from("forum_reports").select("id,topic_id,post_id,reporter_id,reason,status,moderator_note,created_at,resolved_at,post:forum_posts(topic_id)").order("created_at",{ascending:false}).limit(100);
    if(r.error){message("Не удалось загрузить очередь жалоб.","error");return}
    root.innerHTML=r.data?.length?r.data.map(x=>'<article class="forum-report-card" data-report-id="'+esc(x.id)+'"><div class="forum-report-card__head"><span class="forum-report-status forum-report-status--'+esc(x.status)+'">'+esc(x.status==="open"?"Открыта":x.status==="reviewing"?"На проверке":x.status==="resolved"?"Решена":"Отклонена")+'</span><time>'+relative(x.created_at)+'</time></div><strong>'+esc(x.topic_id?"Жалоба на тему #"+x.topic_id:"Жалоба на сообщение #"+x.post_id)+'</strong><p>'+esc(x.reason)+'</p><div class="forum-report-card__actions"><a class="button button--ghost" href="'+("/forum/topic/"+encodeURIComponent(x.topic_id||x.post?.topic_id||""))+'">Открыть</a><select data-report-status><option value="open"'+(x.status==="open"?" selected":"")+'>Открыта</option><option value="reviewing"'+(x.status==="reviewing"?" selected":"")+'>На проверке</option><option value="resolved"'+(x.status==="resolved"?" selected":"")+'>Решена</option><option value="dismissed"'+(x.status==="dismissed"?" selected":"")+'>Отклонена</option></select><button class="button button--primary" type="button" data-save-report>Сохранить</button></div></article>').join(""):'<div class="forum-empty"><span class="section-kicker">QUEUE EMPTY</span><h3>Жалоб нет.</h3><p>Новая жалоба появится здесь автоматически.</p></div>';
  };
  root.addEventListener("click",async e=>{
    const button=e.target.closest("[data-save-report]");if(!button)return;
    const card=button.closest("[data-report-id]"),id=Number(card.dataset.reportId),status=qs("[data-report-status]",card).value;button.disabled=true;
    const patch={status};if(status==="resolved"||status==="dismissed"){patch.resolved_at=new Date().toISOString();patch.resolved_by=user.id}else{patch.resolved_at=null;patch.resolved_by=null}
    const r=await client.from("forum_reports").update(patch).eq("id",id);button.disabled=false;
    if(r.error){message("Не удалось сохранить статус жалобы.","error");return}message("Статус обновлён.","success");await load();
  });
  await load();
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});else void init();
})();