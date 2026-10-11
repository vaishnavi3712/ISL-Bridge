/* ================================================================
   ISL Bridge — Learn module: lessons, fingerspelling, quiz, progress
   ================================================================ */
"use strict";

const LESSONS=[
  {id:"l1",no:"Lesson 1",title:"Greetings & Politeness",desc:"Say hello, thanks, sorry, yes and no — the first signs every beginner needs.",words:["HELLO","THANK","PLEASE","SORRY","YES","NO","GOOD"]},
  {id:"l2",no:"Lesson 2",title:"Me, You & Questions",desc:"Introduce yourself and ask who, what and where.",words:["ME","YOU","NAME","WHAT","WHO","WHERE"]},
  {id:"l3",no:"Lesson 3",title:"Food & Drink",desc:"Order water, chai and food — survival signs for any Indian kitchen.",words:["WATER","FOOD","EAT","DRINK","MILK","TEA"]},
  {id:"l4",no:"Lesson 4",title:"Home, School & Travel",desc:"Talk about places and moving around — home, school, hospital, train, bus.",words:["HOME","SCHOOL","HOSPITAL","TRAIN","BUS","GO","COME"]},
  {id:"l5",no:"Lesson 5",title:"Feelings & Requests",desc:"Ask for help, say what you want, like and see.",words:["HELP","WANT","LIKE","SEE","FRIEND","FINE","LEARN"]}
];

const tr=(k,v)=>I18N.t(k,v);
const lessonTitle=(L,i)=>I18N.lang==="en"?L.title:tr("L"+(i+1));
const lessonNo=(L,i)=>I18N.lang==="en"?L.no:(i+1)+".";
const lessonDesc=L=>I18N.lang==="en"?L.desc:L.words.map(w=>glossLabel(w)).join(" · ");
const hintFor=g=>{ const l=I18N.lang; if(l==="en") return (MEANINGS[g]||{}).h||"Watch the movement and copy it."; return I18N.hintOf(g)||tr("hint_g"); };
const meaningFor=g=>{ const en=(MEANINGS[g]||{m:g.toLowerCase()}).m; return I18N.lang==="en"?en:glossLabel(g)+"  ("+en+")"; };

/* ---------------- progress ---------------- */
function getProg(){ try{ return JSON.parse(localStorage.getItem("isl_progress")||'{"done":[],"quizBest":0}'); }catch(e){ return {done:[],quizBest:0}; } }
function setProg(p){ try{ localStorage.setItem("isl_progress",JSON.stringify(p)); }catch(e){} if(window.ISL&&ISL.role==="user"&&window.ISLSync) ISLSync.save(p); renderProgress(); }
function renderProgress(){
  const p=getProg(), total=LESSONS.length;
  const pct=Math.round(p.done.length/total*80 + Math.min(p.quizBest,5)/5*20);
  $("learnBar").style.width=pct+"%";
  $("learnPct").textContent=tr("pct",{p:pct,d:p.done.length,t:total,b:p.quizBest});
  $("quizScore").textContent=tr("best")+": "+p.quizBest+"/5";
  document.querySelectorAll(".lcard").forEach(c=>{ const b=c.querySelector(".donebadge");
    if(b) b.style.display=getProg().done.includes(c.dataset.lid)?"inline":"none"; });
}

/* ---------------- learn hub ---------------- */
function renderLessonCards(){
  const box=$("lessonCards"); box.innerHTML="";
  const p=getProg();
  LESSONS.forEach((L,i)=>{
    const locked=i>0&&!p.done.includes(LESSONS[i-1].id);
    const c=document.createElement("div"); c.className="card lcard"; c.dataset.lid=L.id;
    c.innerHTML='<div class="ln">'+lessonNo(L,i)+(locked?' · 🔒 '+tr("locked"):"")+'</div><b>'+lessonTitle(L,i)+'</b><span class="ld">'+lessonDesc(L)+"</span>"+
      '<div class="row"><span class="kv">'+L.words.length+' '+tr("signs")+'</span><span class="donebadge" style="display:'+(p.done.includes(L.id)?"inline":"none")+'">✔ '+tr("done")+'</span></div>';
    if(locked) c.style.opacity=.55;
    c.onclick=()=>{ if(locked){ toast(tr("t_locked")); return; } openLesson(L.id); };
    box.appendChild(c);
  });
  renderProgress();
}

/* ---------------- lesson screen ---------------- */
const lessonAvatar=new (window.AvatarClass||AvatarPlayer)($("lessonAvatar"),$("lessonNow"));
let curLesson=null,curWord=0;
function openLesson(id){
  curLesson=LESSONS.find(l=>l.id===id); curWord=0;
  go("scr-lesson");
  renderWord();
}
function renderWord(){
  const g=curLesson.words[curWord], li=LESSONS.indexOf(curLesson);
  $("lessonTitle").textContent=lessonNo(curLesson,li)+" "+lessonTitle(curLesson,li);
  $("lessonStep").textContent=(curWord+1)+" / "+curLesson.words.length;
  $("lessonMeaning").textContent="“"+meaningFor(g)+"”";
  $("lessonHint").textContent="💡 "+hintFor(g);
  const wr=$("lessonWords"); wr.innerHTML="";
  curLesson.words.forEach((w,i)=>{ const b=document.createElement("button"); b.textContent=glossLabel(w);
    b.classList.toggle("on",i===curWord);
    b.onclick=()=>{ curWord=i; renderWord(); }; wr.appendChild(b); });
  playCur();
}
function playCur(){ lessonAvatar.speed=$("slowMo").checked?0.45:1; lessonAvatar.playWord(curLesson.words[curWord]); beep(500,0.04); }
$("btnReplay").onclick=playCur;
$("btnPrevW").onclick=()=>{ if(curWord>0){ curWord--; renderWord(); } };
$("btnNextW").onclick=()=>{ if(curWord<curLesson.words.length-1){ curWord++; renderWord(); } else toast(tr("t_lessondone")); };
$("slowMo").onchange=playCur;
$("btnMarkDone").onclick=()=>{
  const p=getProg(); if(!p.done.includes(curLesson.id)) p.done.push(curLesson.id);
  setProg(p); toast(tr("t_lessondone")); beep(880,0.1); setTimeout(()=>beep(1175,0.12),130);
};

/* ---------------- fingerspelling trainer ---------------- */
const abc=$("abcRow");
"abcdefghijklmnopqrstuvwxyz".split("").forEach(ch=>{
  const b=document.createElement("button"); b.textContent=ch.toUpperCase();
  b.onclick=()=>{ go("scr-lesson"); $("lessonTitle").textContent="🔤 "+tr("fs"); $("lessonStep").textContent=ch.toUpperCase();
    $("lessonMeaning").textContent="“"+ch.toUpperCase()+"”"; $("lessonHint").textContent="💡 "+tr("hint_g");
    $("lessonWords").innerHTML="";
    lessonAvatar.speed=$("slowMo").checked?0.45:1; lessonAvatar.playGlosses([ch.toUpperCase()],false,false); };
  abc.appendChild(b);
});
$("btnSpell").onclick=()=>{
  const w=($("spellWord").value||"").toLowerCase().replace(/[^a-z]/g,"");
  if(!w){ toast(tr("ph_spell")); return; }
  go("scr-lesson");
  $("lessonTitle").textContent="🔤 "+tr("fs"); $("lessonStep").textContent=w.length;
  $("lessonMeaning").textContent="“"+w.toUpperCase()+"”"; $("lessonHint").textContent="💡 "+tr("hint_g");
  $("lessonWords").innerHTML="";
  lessonAvatar.speed=1; lessonAvatar.playGlosses([w.toUpperCase()],false,false);
};

/* ---------------- quiz ---------------- */
const quizAvatar=new (window.AvatarClass||AvatarPlayer)($("quizAvatar"),$("quizNow"));
const QUIZ_POOL=Object.keys(MEANINGS);
let qRound=0,qScore=0,qAns=null,qLock=false,qBtnKey="start";
function setQBtn(k){ qBtnKey=k; $("btnQuizNext").textContent=tr(k)+" ▶"; }
setQBtn("start");
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function nextQuestion(){
  if(qRound>=5){ finishQuiz(); return; }
  qLock=false; qAns=QUIZ_POOL[Math.floor(Math.random()*QUIZ_POOL.length)];
  $("quizNow").textContent=tr("q_watch");
  quizAvatar.playWord(qAns);
  const opts=shuffle([qAns,...shuffle(QUIZ_POOL.filter(g=>g!==qAns)).slice(0,3)]);
  const box=$("quizOpts"); box.innerHTML="";
  opts.forEach(g=>{
    const b=document.createElement("button"); b.className="qopt"; b.dataset.g=g; b.textContent=I18N.lang==="en"?MEANINGS[g].m:glossLabel(g);
    b.onclick=()=>{
      if(qLock) return; qLock=true;
      if(g===qAns){ b.classList.add("right"); qScore++; beep(880,0.1); toast(tr("t_correct")); }
      else { b.classList.add("wrong"); box.querySelectorAll(".qopt").forEach(o=>{ if(o.dataset.g===qAns) o.classList.add("right"); }); beep(220,0.2); }
      qRound++; setQBtn(qRound>=5?"results":"nextq");
      $("quizResult").textContent=tr("score")+": "+qScore+"/"+qRound;
    };
    box.appendChild(b);
  });
}
function finishQuiz(){
  $("quizNow").textContent="🎉 "+tr("score")+": "+qScore+"/5";
  const p=getProg(); if(qScore>p.quizBest){ p.quizBest=qScore; setProg(p); }
  $("quizResult").textContent=tr("score")+": "+qScore+"/5 · "+tr("best")+": "+p.quizBest+"/5";
  setQBtn("again");
  quizAvatar.playGlosses(qScore>=4?["GOOD","THANK"]:qScore>=3?["GOOD"]:["HELP","LEARN"],false,false);
  if(qScore>=4) toast(tr("t_correct"));
  qRound=0; qScore=0;
}
$("btnQuizNext").onclick=()=>{
  if(qBtnKey==="results"){ finishQuiz(); return; }
  if(qBtnKey==="again"||qBtnKey==="start"){ qRound=0; qScore=0; $("quizResult").textContent=""; }
  nextQuestion();
};

/* re-render learn screens when the language changes */
window.addEventListener("langchange",()=>{
  renderLessonCards(); setQBtn(qBtnKey);
  if(curLesson&&$("scr-lesson").classList.contains("active")) renderWord();
  $("quizNow").textContent=tr("q_watch");
});

/* init */
renderLessonCards();
