/* Learner account side of the main site: saved progress, extra material, knowledge quizzes. */
(function(){
const token=()=>document.querySelector('meta[name="csrf-token"]').content;
const jpost=(u,b)=>fetch(u,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":token()},body:JSON.stringify(b)});
window.ISLSync={ save(p){ jpost("/api/progress",{done:p.done,quizBest:p.quizBest}).catch(()=>{}); } };
const el=(tag,cls,txt,auto)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!==undefined) e.textContent=txt; if(auto) e.setAttribute("data-auto",""); return e; };

if(location.hash.startsWith("#scr-")&&document.getElementById(location.hash.slice(1))) go(location.hash.slice(1));
if(!(window.ISL&&ISL.role==="user")) return;

/* the server copy is the truth, so two learners on one browser never mix their progress */
fetch("/api/progress").then(r=>r.json()).then(p=>{
  try{ localStorage.setItem("isl_progress",JSON.stringify({done:p.done,quizBest:p.quizBest})); }catch(e){}
  renderProgress(); renderLessonCards();
}).catch(()=>{});

/* more learning material */
fetch("/api/extras").then(r=>r.json()).then(x=>{
  const body=document.getElementById("extrasBody"); body.innerHTML="";
  if(x.videos&&x.videos.length){
    const g=el("div","vidgrid");
    x.videos.forEach(v=>{ const d=el("div","vid"); const f=document.createElement("iframe");
      f.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(v.id); f.title=v.title; f.loading="lazy"; f.allowFullscreen=true;
      d.append(f,el("span","",v.title,true)); g.append(d); });
    body.append(g);
  }
  (x.materials||[]).forEach(m=>{ const d=el("details","more"); const s=el("summary","",m.title,true); d.append(s,el("p","kv",m.body,true)); body.append(d); });
  if(x.links&&x.links.length){ const r=el("div","kv"); x.links.forEach(l=>{ const a=el("a","",l.title); a.href=l.url; a.target="_blank"; a.rel="noopener"; r.append(a," · "); }); body.append(r); }
  document.getElementById("extrasCard").hidden=false; I18N.autoTranslate();
}).catch(()=>{});

/* knowledge quizzes (questions and answers live on the server) */
const kb=document.getElementById("knowBody");
function loadList(){
  fetch("/api/knowledge").then(r=>r.json()).then(list=>{
    kb.innerHTML="";
    list.forEach(q=>{
      const row=el("div","row"); row.append(el("b","",q.title,true));
      if(q.best) row.append(el("span","kv",I18N.t("best_s")+": "+q.best[0]+"/"+q.best[1]));
      row.append(el("div","hspace"));
      const b=el("button","btn"); b.textContent=I18N.t("start"); b.setAttribute("data-i18n","start"); b.onclick=()=>run(q.id); row.append(b);
      kb.append(row);
    });
    document.getElementById("knowCard").hidden=false; I18N.autoTranslate();
  }).catch(()=>{});
}
async function run(id){
  const d=await (await fetch("/api/knowledge/"+id)).json();
  kb.innerHTML=""; kb.append(el("b","",d.title,true));
  d.questions.forEach((q,i)=>{
    const box=el("div"); box.append(el("p","",q.q,true));
    q.options.forEach((o,j)=>{ const l=el("label","switch"); const r=document.createElement("input"); r.type="radio"; r.name="k"+i; r.value=j; l.append(r,el("span","",o,true)); box.append(l); });
    kb.append(box);
  });
  const go=el("button","btn green"); go.setAttribute("data-i18n","check"); go.textContent=I18N.t("check"); const res=el("p","kv"); kb.append(go,res);
  I18N.autoTranslate();
  go.onclick=async()=>{
    const answers=d.questions.map((_,i)=>+(kb.querySelector(`input[name=k${i}]:checked`)?.value??-1));
    const r=await (await jpost("/api/knowledge/"+id,{answers})).json();
    d.questions.forEach((_,i)=>kb.querySelectorAll(`input[name=k${i}]`).forEach(inp=>{
      const l=inp.parentElement; inp.disabled=true;
      if(+inp.value===r.key[i]) l.style.color="var(--acc3)"; else if(inp.checked) l.style.color="var(--bad)";
    }));
    res.textContent=I18N.t("score")+": "+r.score+"/"+r.total; go.hidden=true;
    const back=el("button","btn ghost"); back.textContent="↩"; back.onclick=loadList; kb.append(back);
  };
}
loadList();
window.addEventListener("langchange",()=>{ document.querySelectorAll("#knowBody button[data-i18n]").forEach(b=>{ b.textContent=I18N.t(b.dataset.i18n); }); });
})();
