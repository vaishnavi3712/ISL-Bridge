/* ================================================================
   ISL Bridge — app core: navigation, theme, interpreter
   ================================================================ */
"use strict";
const $=id=>document.getElementById(id);
function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove("show"),2600); }
function beep(f,d){ try{ const a=beep.ctx||(beep.ctx=new (window.AudioContext||window.webkitAudioContext)());
  const o=a.createOscillator(),g=a.createGain(); o.frequency.value=f; o.type="sine";
  g.gain.setValueAtTime(0.08,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+d);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime+d); }catch(e){} }

/* ---------------- Theme ---------------- */
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); $("btnTheme").textContent=t==="dark"?"🌙":"☀️"; try{localStorage.setItem("isl_theme",t);}catch(e){} }
applyTheme((()=>{try{return localStorage.getItem("isl_theme")||"dark";}catch(e){return "dark";}})());
$("btnTheme").onclick=()=>applyTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");

/* ---------------- Screen navigation (tabs + stack + back) ---------------- */
const ROOTS=["scr-home","scr-interp","scr-avatar","scr-learn","scr-quiz"];
let navStack=[]; let currentRoot="scr-home";
const GATED=["scr-learn","scr-lesson","scr-quiz"];   /* need a learner account */
function show(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll("#tabbar .tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===id||(id==="scr-lesson"&&t.dataset.tab==="scr-learn")));
  window.scrollTo({top:0});
}
function go(id,push=true){
  if(GATED.includes(id)&&!(window.ISL&&window.ISL.role==="user")){ location.href="/login/user?next="+encodeURIComponent("/#"+id); return; }
  if(push&&currentRoot!==id) navStack.push(currentRoot);
  if(ROOTS.includes(id)){ currentRoot=id; navStack=[]; }
  $("btnBack").classList.toggle("show",navStack.length>0);
  show(id);
}
function back(){
  if(!navStack.length) return;
  const prev=navStack.pop();
  if(ROOTS.includes(prev)){ currentRoot=prev; }
  $("btnBack").classList.toggle("show",navStack.length>0);
  show(prev);
}
$("btnBack").onclick=back;
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
document.querySelectorAll("#tabbar .tab").forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));
document.addEventListener("keydown",e=>{ const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||"")); if(e.key==="Escape"||(e.key==="Backspace"&&!typing)) back(); });
/* touch: swipe right from left edge = back (Android-style) */
let tx0=0,ty0=0;
document.addEventListener("touchstart",e=>{ const t=e.changedTouches[0]; tx0=t.clientX; ty0=t.clientY; },{passive:true});
document.addEventListener("touchend",e=>{ const t=e.changedTouches[0];
  if(tx0<28&&t.clientX-tx0>80&&Math.abs(t.clientY-ty0)<60) back(); },{passive:true});

/* ---------------- Lexicon & dialects ---------------- */
const BASE_LEX = {
  ME:{w:"I",pos:"pron"}, YOU:{w:"you",pos:"pron"}, HE:{w:"he",pos:"pron"}, SHE:{w:"she",pos:"pron"},
  WATER:{w:"water",pos:"n"}, FOOD:{w:"food",pos:"n"}, HOME:{w:"home",pos:"n"}, NAME:{w:"name",pos:"n"},
  SCHOOL:{w:"school",pos:"n"}, TEACHER:{w:"teacher",pos:"n"}, BOOK:{w:"book",pos:"n"}, MILK:{w:"milk",pos:"n"},
  TEA:{w:"tea",pos:"n"}, COFFEE:{w:"coffee",pos:"n"}, HELP:{w:"help",pos:"v"}, GO:{w:"go",pos:"v"},
  WANT:{w:"want",pos:"v"}, EAT:{w:"eat",pos:"v"}, DRINK:{w:"drink",pos:"v"}, LIKE:{w:"like",pos:"v"},
  GIVE:{w:"give",pos:"v"}, COME:{w:"come",pos:"v"}, SEE:{w:"see",pos:"v"}, LEARN:{w:"learn",pos:"v"},
  GOOD:{w:"good",pos:"adj"}, FINE:{w:"fine",pos:"adj"}, BIG:{w:"big",pos:"adj"}, HOT:{w:"hot",pos:"adj"},
  WHAT:{w:"what",pos:"wh"}, WHERE:{w:"where",pos:"wh"}, WHO:{w:"who",pos:"wh"}, WHEN:{w:"when",pos:"wh"},
  HOW:{w:"how",pos:"wh"}, HELLO:{w:"hello",pos:"greet"}, THANK:{w:"thank",pos:"v"}, YES:{w:"yes",pos:"yesno"},
  NO:{w:"no",pos:"yesno"}, PLEASE:{w:"please",pos:"polite"}, SORRY:{w:"sorry",pos:"polite"},
  TRAIN:{w:"train",pos:"n"}, BUS:{w:"bus",pos:"n"}, HOSPITAL:{w:"hospital",pos:"n"}, MORNING:{w:"morning",pos:"n"},
  FRIEND:{w:"friend",pos:"n"}
};
const DIALECT = {
  "Delhi NCR":            { METRO:{w:"metro",pos:"n"} },
  "Mumbai / Maharashtra": { LOCAL:{w:"local train",pos:"n"}, VADAPAV:{w:"vada pav",pos:"n"} },
  "Chennai / Tamil Nadu": { FILTERCOFFEE:{w:"filter coffee",pos:"n"}, AUTO:{w:"auto-rickshaw",pos:"n"} },
  "Kolkata / Bengal":     { TRAM:{w:"tram",pos:"n"} }
};
function lexicon(){ const r={...BASE_LEX}; const d=DIALECT[$("region").value]; if(d) Object.assign(r,d); return r; }

/* ---------------- Heuristic static gestures + few-shot k-NN ------------- */
function fingersUp(lm){
  const d=(a,b)=>Math.hypot(lm[a].x-lm[b].x,lm[a].y-lm[b].y,(lm[a].z||0)-(lm[b].z||0));
  const ext=[8,12,16,20].map((tip,i)=>d(tip,0)>d(6+i*4,0)*1.12);
  const thumb=d(4,17)>d(3,17)*1.05;
  return {ext,thumb};
}
/* The hand-written gesture rules (open palm = HELLO, fist = NO, ...) were removed:
   recognition now comes only from the trained model and from signs taught in the browser. */
function heuristicGloss(lm){ return null; }
const T_LEN=16;
let SAMPLES=[];
try{ SAMPLES=JSON.parse(localStorage.getItem("isl_samples")||"[]"); }catch(e){}
function frameFeat(lm){
  const w=lm[0]; let pts=lm.map(p=>[p.x-w.x,p.y-w.y,(p.z||0)-w.z]);
  let mx=1e-6; pts.forEach(p=>{const n=Math.hypot(p[0],p[1],p[2]); if(n>mx)mx=n;});
  return pts.flatMap(p=>[p[0]/mx,p[1]/mx,p[2]/mx]);
}
function resample(seq,T){
  if(!seq.length) return [];
  if(seq.length===1) return Array(T).fill(0).map(()=>seq[0].slice());
  const out=[]; for(let i=0;i<T;i++){ const t=i/(T-1)*(seq.length-1), a=Math.floor(t), b=Math.min(a+1,seq.length-1), f=t-a;
    out.push(seq[a].map((v,k)=>v*(1-f)+seq[b][k]*f)); } return out;
}
function seqDist(a,b){ let s=0; for(let i=0;i<a.length;i++){ let d=0; for(let k=0;k<a[i].length;k++){const df=a[i][k]-b[i][k]; d+=df*df;} s+=Math.sqrt(d/a[i].length); } return s/a.length; }
function knnPredict(featSeq){
  if(!SAMPLES.length) return null;
  const rs=resample(featSeq,T_LEN); let best=null,bd=1e9;
  for(const s of SAMPLES){ const d=seqDist(rs,s.seq); if(d<bd){bd=d;best=s.label;} }
  return bd<0.32? {label:best,dist:bd} : null;
}
function saveSamples(){ try{ localStorage.setItem("isl_samples",JSON.stringify(SAMPLES.slice(-120))); }catch(e){} }
/* the fake "demo sign library" was removed */

/* ---------------- MediaPipe Holistic ---------------- */
const vid=$("vid"), skel=$("skel"), sctx=skel.getContext("2d");
let frames=0, lastT=performance.now(), curHandLm=null, browRaise=false, frameBuffer=[];
/* ---------------- Trained model (server) for Sign to Voice ---------------- */
const WORD_THRESH=0.35, LETTER_THRESH=0.60;   /* words are favoured: a letter/digit must be much more certain than a word */
const LIBRARY_ONLY=true;   /* true: Voice to Sign uses only the recorded signs (unknown words are fingerspelled). false: also the built-in animations */
let modelBuf=[], wristBuf=[], modelHit=null, modelBusy=false, modelOff=false, modelErr="", modelSeen=null, stillRun=0, lastWordT=-1e9;
/* Letters/digits are held still hand shapes, words are movements. A letter is only accepted when the hand has been
   still for LETTER_STILL frames (about 0.3 s) and no word was just signed. Tune STEP_* if your camera is jittery. */
const LETTER_STILL=8, STEP_SHAPE=0.02, STEP_WRIST=0.008;
function modelFeat(hands){
  const out=new Array(126).fill(0);
  hands.map(h=>({h,x:h[0].x})).sort((a,b)=>a.x-b.x).slice(0,2).forEach((o,i)=>{
    const w=o.h[0], v=[];
    o.h.forEach(p=>v.push(p.x-w.x,p.y-w.y,(p.z||0)-(w.z||0)));
    const m=Math.max(1e-6,...v.map(Math.abs));
    v.forEach((a,k)=>{ out[i*63+k]=Math.round(a/m*1e4)/1e4; });
  });
  return out;
}
setInterval(async()=>{
  if(document.hidden||modelOff||modelBusy||!curHandLm||modelBuf.length<6) return;
  modelBusy=true;
  try{
    const tok=document.querySelector('meta[name="csrf-token"]');
    const r=await fetch("/api/predict_public",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":tok?tok.content:""},body:JSON.stringify({seqs:[modelBuf.slice(-12),modelBuf.slice(-30),modelBuf.slice(-60)]})});
    if(r.status===503){ modelOff=true; try{ modelErr=(await r.json()).error||"model not loaded"; }catch(e){ modelErr="model not loaded"; } }
    else if(!r.ok){ try{ modelErr=(await r.json()).error||("server error "+r.status); }catch(e){ modelErr="server error "+r.status; } }
    else{
      modelErr="";
      const tops=(await r.json()).top||[];
      modelSeen=tops;
      const pick=tops.find(t=>t.conf>=(t.label.length>1?WORD_THRESH:LETTER_THRESH));   /* list is already ranked words-first */
      modelHit=pick?{label:pick.label,conf:pick.conf,isWord:pick.label.length>1,t:performance.now()}:null;
    }
  }catch(e){ /* server not running: simple gestures still work */ }
  modelBusy=false;
},200);
function onResults(res){
  frames++; const now=performance.now();
  if(now-lastT>500){ const f=Math.round(frames*1000/(now-lastT)); $("fpsHud").textContent="FPS: "+f; $("stFps").textContent=f; frames=0; lastT=now; }
  skel.width=skel.clientWidth; skel.height=skel.clientHeight;
  const W=skel.width,H=skel.height; sctx.clearRect(0,0,W,H);
  const map=p=>({x:p.x*W,y:p.y*H});
  const privacyOn=$("privacy").checked;
  vid.style.display=privacyOn?"none":"block";
  const drawConns=(lms,conns,color)=>{ if(!lms)return; sctx.strokeStyle=color; sctx.lineWidth=2;
    for(const [a,b] of conns){ sctx.beginPath(); sctx.moveTo(map(lms[a]).x,map(lms[a]).y); sctx.lineTo(map(lms[b]).x,map(lms[b]).y); sctx.stroke(); }
    sctx.fillStyle=color; for(const p of lms){ const q=map(p); sctx.beginPath(); sctx.arc(q.x,q.y,2.4,0,7); sctx.fill(); } };
  const HC=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  const PC=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
  drawConns(res.poseLandmarks,PC,"rgba(52,211,153,.85)");
  drawConns(res.leftHandLandmarks,HC,"rgba(56,189,248,.95)");
  drawConns(res.rightHandLandmarks,HC,"rgba(167,139,250,.95)");
  if(res.faceLandmarks){
    sctx.strokeStyle="rgba(251,191,36,.9)"; sctx.lineWidth=1.6; sctx.beginPath();
    [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109].forEach((idx,i)=>{ const q=map(res.faceLandmarks[idx]); i?sctx.lineTo(q.x,q.y):sctx.moveTo(q.x,q.y); });
    sctx.closePath(); sctx.stroke();
    const L=res.faceLandmarks;
    browRaise=(L[159].y-L[105].y>0.028&&L[145].y-L[334].y>0.028);
    $("stBrow").textContent=browRaise?"RAISED":"flat";
    $("nmfHud").textContent="Non-manual: "+(browRaise?"❓ raised brows (question)":"—");
  }
  curHandLm=res.rightHandLandmarks||res.leftHandLandmarks||null;
  if(curHandLm){ frameBuffer.push(frameFeat(curHandLm)); if(frameBuffer.length>24) frameBuffer.shift(); }
  else frameBuffer.length=Math.max(0,frameBuffer.length-2);
  /* trained model: 126 numbers per frame, same layout as the training notebook */
  const hands=[res.leftHandLandmarks,res.rightHandLandmarks].filter(Boolean);
  if(hands.length){
    const f=modelFeat(hands), w=hands.map(h=>h[0]).sort((a,b)=>a.x-b.x)[0];
    const pf=modelBuf[modelBuf.length-1], pw=wristBuf[wristBuf.length-1];
    if(pf){ let d=0; for(let j=0;j<126;j++) d+=Math.abs(f[j]-pf[j]);
            stillRun=(d/126<STEP_SHAPE&&Math.hypot(w.x-pw.x,w.y-pw.y)<STEP_WRIST)? stillRun+1 : 0; }
    modelBuf.push(f); wristBuf.push({x:w.x,y:w.y});
    if(modelBuf.length>60){ modelBuf.shift(); wristBuf.shift(); }
  } else { const k=Math.max(0,modelBuf.length-3); modelBuf.length=k; wristBuf.length=k; modelHit=null; stillRun=0; }
}
async function initMP(){
  if(typeof Holistic==="undefined"){ $("mpStatus").textContent="MediaPipe failed to load (check internet/CDN)"; return; }
  try{
    const holistic=new Holistic({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${f}`});
    holistic.setOptions({modelComplexity:0,smoothLandmarks:true,refineFaceLandmarks:false,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
    holistic.onResults(onResults);
    const cam=new Camera(vid,{onFrame:async()=>{await holistic.send({image:vid});},width:640,height:480});
    await cam.start();
    $("mpStatus").textContent="● live (skeletal only in privacy mode)";
  }catch(e){ $("mpStatus").textContent="camera unavailable: "+e.message; }
}
initMP();

/* ---------------- Live prediction (with on-camera captions) ---------------- */
let lastAdded="", lastAddT=0, stableLabel="", stableCount=0, noSignSince=performance.now(), sentenceDone=false, lastGlossT=0;
function capLive(t){ $("capLive").textContent=t||""; }
function renderCapWords(){ $("capWords").textContent=glosses.filter(g=>g!=="?").map(glossWord).join("  ·  "); }
function setCapEng(t,idle){ const el=$("capEng"); el.textContent=t; el.classList.toggle("idle",!!idle); }
setInterval(()=>{
  if(document.hidden) return;
  const now=performance.now();
  let g=null, mode="—";
  const knn=frameBuffer.length>=8? knnPredict(frameBuffer.slice(-16)) : null;
  let mh=(modelHit&&curHandLm&&now-modelHit.t<900)? modelHit : null, held="";
  /* words win: a letter is held back while the hand is moving or right after a word was signed */
  if(mh&&!mh.isWord&&(stillRun<LETTER_STILL||now-lastWordT<1500)){ held="letter "+mh.label.toUpperCase()+" held back ("+(now-lastWordT<1500?"word just signed":"hand moving")+")"; mh=null; }
  if(knn){ g=knn.label; mode="k-NN · d="+knn.dist.toFixed(2); }
  else if(mh){ g=mh.label.toUpperCase(); mode="model · "+Math.round(mh.conf*100)+"%"; }
  else if(curHandLm){ mode=held?held:modelErr?("model error: "+modelErr.slice(0,70)):(modelSeen&&modelSeen.length?("sees "+modelSeen.map(t=>t.label+" "+Math.round(t.conf*100)+"%").join(", ")+" (too unsure)"):"waiting for model…"); }
  $("stMode").textContent=mode+" · "+(stillRun>=LETTER_STILL?"still":"moving");
  if(g){
    noSignSince=now;
    const need=(mh&&!knn&&mh.isWord)?(mh.conf>=0.6?1:2):3;      /* a confident model answer needs fewer repeats */
    if(g===stableLabel) stableCount++; else { stableLabel=g; stableCount=1; }
    $("predBox").innerHTML=glossLabel(g)+"<small>stable "+Math.min(stableCount,need)+"/"+need+" · "+mode+"</small>";
    capLive("✋ "+I18N.t("detecting")+": "+glossWord(g)+(stableCount>=need?" ✓":"…"));
    if(stableCount>=need&&(g!==lastAdded)&&now-lastAddT>500){
      addGloss(g); lastAdded=g; lastAddT=now; if(mh&&mh.isWord) lastWordT=now;
      if(browRaise){ setTgl($("btnQ"),true); toast("Raised eyebrows detected → question grammar applied ❓"); }
    }
  } else {
    stableCount=0; stableLabel="";
    $("predBox").innerHTML="—<small>"+I18N.t("ph_pred")+"</small>";
    capLive(curHandLm?"✋ hand seen…":"");
    /* hand away for a moment -> the same sign may be signed again */
    if(now-noSignSince>600) lastAdded="";
  }
  /* auto-sentence: when signing pauses, build the English sentence and speak it */
  if($("autoSent").checked && glosses.length && !sentenceDone && now-lastGlossT>2200 && !g){
    doTranslate(true);
  }
},160);

/* ---------------- Sentence builder + SOV→English engine ---------------- */
let glosses=[];
function renderChips(){
  $("chips").innerHTML="";
  glosses.forEach((g,i)=>{ const c=document.createElement("span"); c.className="chip"; c.innerHTML=glossLabel(g)+(g==="?"?"":' <span class="x" data-i="'+i+'">✕</span>');
    c.querySelector(".x")?.addEventListener("click",()=>{ glosses.splice(i,1); renderChips(); renderCapWords(); }); $("chips").appendChild(c); });
}
function addGloss(g){
  if(sentenceDone){ glosses=[]; setTgl($("btnQ"),false); setTgl($("btnNeg"),false); sentenceDone=false; setCapEng("",false); }
  glosses.push(g); lastGlossT=performance.now(); renderChips(); renderCapWords(); beep(660,0.06);
  $("predBox").innerHTML=glossLabel(g)+"<small>✓</small>";
  if($("autoSpeak").checked) speakStream(glossWord(g));   /* every sign is spoken as soon as it is recognised */
}
function setTgl(el,on){ el.classList.toggle("on",on); }
$("btnQ").onclick=()=>{ const on=!$("btnQ").classList.contains("on"); setTgl($("btnQ"),on); if(on&&!glosses.includes("?")){glosses.push("?"); renderChips();} if(!on){glosses=glosses.filter(x=>x!=="?"); renderChips();} };
$("btnNeg").onclick=()=>setTgl($("btnNeg"),!$("btnNeg").classList.contains("on"));
$("btnUndo").onclick=()=>{ glosses.pop(); renderChips(); renderCapWords(); };
$("btnClear").onclick=()=>{ glosses=[]; renderChips(); renderCapWords(); setCapEng(I18N.t("idle_cam"),true); sentenceDone=false; setTgl($("btnQ"),false); setTgl($("btnNeg"),false); };
function renderQuick(){ $("quickGloss").innerHTML=""; ["ME","YOU","WATER","FOOD","HOME","GO","WANT","NAME","HELP","GOOD","THANK","WHAT"].forEach(g=>{ const b=document.createElement("button"); b.className="seqcard"; b.textContent=glossLabel(g); b.onclick=()=>addGloss(g); $("quickGloss").appendChild(b); }); }
renderQuick();

function conjugate(subj,verb){ return verb==="go"&&subj==="I" ? "am going" : verb; }
function translateGlosses(gls,q,neg){
  const lex=lexicon(); const toks=gls.filter(g=>g!=="?").map(g=>({g,e:(lex[g]||{w:g.toLowerCase(),pos:"n"})}));
  if(!toks.length) return "";
  const wh=toks.find(t=>t.e.pos==="wh");
  const subj=toks.find(t=>t.e.pos==="pron");
  const verb=toks.find(t=>t.e.pos==="v");
  const nouns=toks.filter(t=>t.e.pos==="n").map(t=>t.e.w);
  const adjs=toks.filter(t=>t.e.pos==="adj").map(t=>t.e.w);
  const greet=toks.find(t=>t.e.pos==="greet");
  const pol=toks.filter(t=>t.e.pos==="polite").map(t=>t.e.w);
  const yn=toks.find(t=>t.e.pos==="yesno");
  if(greet) return "Hello"+(subj?", "+subj.e.w:"")+"!"+(pol.length?" "+pol.join(", ")+".":"");
  if(yn) return yn.e.w==="yes"?"Yes.":"No.";
  const S=subj?subj.e.w:"I";
  if(wh){
    const v=verb?conjugate(S,verb.e.w):"do";
    const aux=S==="I"?"do I":(wh.e.w==="what"&&nouns.includes("name")?"is your":"do you");
    return wh.e.w.charAt(0).toUpperCase()+wh.e.w.slice(1)+" "+aux+" "+v+" "+nouns.filter(n=>n!=="name").join(" ")+"?";
  }
  if(q){ const aux=S==="I"?"do":(S==="you"?"do":"does");
    return (aux.charAt(0).toUpperCase()+aux.slice(1))+" "+S+" "+(verb?verb.e.w:"")+" "+nouns.join(" ")+"?"; }
  if(!verb){ const words=toks.map(t=>t.e.w);
    return S.charAt(0).toUpperCase()+S.slice(1)+" "+(neg?"do not ":"")+words.filter(w=>w!==S.toLowerCase()).join(" ")+"."; }
  const v=conjugate(S,verb.e.w);
  return S.charAt(0).toUpperCase()+S.slice(1)+" "+(neg?(v.includes("am")?"am not ":"don't "):"")+v.replace("am ","")+" "+nouns.join(" ")+" "+adjs.join(" ")+pol.join(" ")+".";
}
async function doTranslate(auto){
  const q=$("btnQ").classList.contains("on")||glosses.includes("?");
  const neg=$("btnNeg").classList.contains("on");
  const clean=x=>x.replace(/\s+([.?!,])/g,"$1").replace(/\s{2,}/g," ").trim();
  let eng=clean(translateGlosses(glosses,q,neg));
  if(eng&&I18N.lang!=="en") eng=clean(await I18N.fromEnglish(eng));   /* translated by the backend, not by a hand-written table */
  $("engTxt").textContent=eng||"—";
  $("glossTxt").textContent="ISL: "+glosses.map(glossLabel).join(" ")+(q?" ❓":"")+(neg?" 🚫":"");
  if(eng){ setCapEng(eng,false); }
  if($("autoSpeak").checked&&eng){ speakQ.length=0; speakStream(eng); }   /* full sentence spoken after the words */
  if(eng) addMsg("them",glosses.map(glossLabel).join(" "),eng,"sign→text");
  sentenceDone=true; lastGlossT=performance.now();
}
$("btnTranslate").onclick=()=>doTranslate(false);
/* ---- speech engine: reliable, continuous audio ---- */
let TTS_VOICE=null, ttsWarned={};
function pickVoice(){
  if(!("speechSynthesis" in window)) return;
  const vs=speechSynthesis.getVoices(); if(!vs.length) return;
  const sr=I18N.tts(), pre=sr.slice(0,2).toLowerCase();
  TTS_VOICE=vs.find(v=>v.lang.replace("_","-")===sr)||vs.find(v=>v.lang.slice(0,2).toLowerCase()===pre)||null;
  if(!TTS_VOICE&&pre==="en") TTS_VOICE=vs.find(v=>/^en/i.test(v.lang))||null;
  if(!TTS_VOICE&&pre!=="en"&&!ttsWarned[pre]){ ttsWarned[pre]=1; toast(I18N.t("t_novoice")); }
}
if("speechSynthesis" in window){ pickVoice(); speechSynthesis.onvoiceschanged=pickVoice; }
function mkUtter(t){ const u=new SpeechSynthesisUtterance(t); u.lang=I18N.tts(); if(TTS_VOICE) u.voice=TTS_VOICE; u.rate=I18N.lang==="en"?1:0.92; return u; }
/* browsers only allow speech after a user gesture – unlock on first click/key */
function unlockTTS(){ try{ const u=new SpeechSynthesisUtterance(" "); u.volume=0; speechSynthesis.speak(u); }catch(e){}
  document.removeEventListener("pointerdown",unlockTTS); document.removeEventListener("keydown",unlockTTS); }
document.addEventListener("pointerdown",unlockTTS); document.addEventListener("keydown",unlockTTS);
/* Chrome silently stops long speech sessions – nudge it */
setInterval(()=>{ if("speechSynthesis" in window&&speechSynthesis.speaking&&!speechSynthesis.paused){ speechSynthesis.pause(); speechSynthesis.resume(); } },9000);

function speak(txt){ const t=txt||$("engTxt").textContent; if(!t||t==="—") return; speakQ.length=0; speechSynthesis.cancel(); speakBusy=false; speakStream(t); }
$("btnSpeak").onclick=()=>speak();

let speakQ=[],speakBusy=false;
function speakStream(text){
  if(!text) return;
  speakQ.push(text);
  while(speakQ.length>4) speakQ.shift();     /* never fall far behind the signer */
  if(!speakBusy) nextSpeak();
}
function nextSpeak(){
  const t=speakQ.shift();
  if(t===undefined){ speakBusy=false; return; }
  speakBusy=true;
  const u=mkUtter(t);
  let fin=false; const done=()=>{ if(fin) return; fin=true; clearTimeout(wd); nextSpeak(); };
  const wd=setTimeout(done,Math.max(2500,t.length*140));   /* watchdog if onend never fires */
  u.onend=done; u.onerror=done;
  try{ speechSynthesis.speak(u); }catch(e){ done(); }
}
function glossLabel(g){ if(g==="?") return g; if(I18N.lang==="en") return g; return I18N.wordOf(g)||g; }
function glossWord(g){
  if(I18N.lang!=="en"){ const w=I18N.wordOf(g); if(w) return w; }
  const lex=lexicon();
  if(lex[g]) return lex[g].w;
  if(typeof MEANINGS!=="undefined"&&MEANINGS[g]) return MEANINGS[g].m;
  return g.toLowerCase();
}

/* ---------------- Recording / training ---------------- */
let recording=false, recFrames=[], recTimer=null;
$("btnRec").addEventListener("pointerdown",e=>{ e.preventDefault(); startRec(); });
$("btnRec").addEventListener("pointerup",stopRec); $("btnRec").addEventListener("pointerleave",()=>{ if(recording) stopRec(); });
function startRec(){
  const label=($("signLabel").value||"").trim().toUpperCase();
  if(!label){ toast("Enter a label first (e.g. WATER)"); beep(220,0.15); return; }
  recording=true; recFrames=[]; $("recdot").classList.add("on"); $("recTxt").textContent="Signing “"+label+"”… release to save"; beep(880,0.08);
  recTimer=setInterval(()=>{ if(curHandLm) recFrames.push(frameFeat(curHandLm)); },40);
}
function stopRec(){
  if(!recording) return; recording=false; clearInterval(recTimer); $("recdot").classList.remove("on");
  if(recFrames.length<6){ toast("Too short — hold the button while signing (~1s)"); return; }
  const label=($("signLabel").value||"").trim().toUpperCase();
  SAMPLES.push({label,seq:resample(recFrames,T_LEN)}); saveSamples(); renderLib();
  toast("Trained “"+label+"” — sign it live to test!"); beep(1200,0.1);
}
$("btnClearLib").onclick=()=>{ SAMPLES=[]; saveSamples(); renderLib(); };
function renderLib(){
  const counts={}; SAMPLES.forEach(s=>counts[s.label]=(counts[s.label]||0)+1);
  const keys=Object.keys(counts);
  $("stSamples").textContent=SAMPLES.length;
  $("libBox").innerHTML="<b>Sign library ("+SAMPLES.length+"):</b> "+(keys.length?keys.map(k=>k+" ×"+counts[k]).join(", "):"empty — load demo or record your own.");
}
renderLib();

/* ---------------- Avatar signer panel ---------------- */
const mainAvatar=new (window.AvatarClass||AvatarPlayer)($("avatar"),$("nowSign"),$("avStatus"));
mainAvatar.loop=false;
mainAvatar.onDone=null;
function wordToGloss(w){
  const lex=lexicon();
  for(const g in lex) if(lex[g].w===w) return g;
  const map={hello:"HELLO",hi:"HELLO",eat:"EAT",drink:"DRINK",study:"LEARN",okay:"FINE",ok:"FINE",morning:"MORNING",teacher:"TEACHER",water:"WATER",food:"FOOD",home:"HOME",name:"NAME",help:"HELP",good:"GOOD",thank:"THANK",thanks:"THANK",want:"WANT",go:"GO",like:"LIKE",see:"SEE",milk:"MILK",tea:"TEA",school:"SCHOOL",book:"BOOK",train:"TRAIN",bus:"BUS",hospital:"HOSPITAL",sorry:"SORRY",please:"PLEASE",come:"COME",give:"GIVE",yes:"YES",no:"NO",what:"WHAT",where:"WHERE",who:"WHO",friend:"FRIEND",my:"ME",i:"ME",am:"",is:"",are:""};
  return map[w]||null;
}
async function textToGlosses(text){
  if(I18N.lang==="en") return englishToGlosses(text);
  const en=await I18N.toEnglish(text);              /* backend translation, then the same English -> gloss rules */
  const r=englishToGlosses(en);
  if(!r.glosses.length) toast(I18N.t("t_unknown"));
  return r;
}
function englishToGlosses(text){
  const q=/\?$/.test(text.trim())||/^(do|does|what|where|who|when|how|is|are)\b/i.test(text.trim());
  const neg=/\bnot\b|n't\b|\bno\b/i.test(text);
  let t=text.toLowerCase().replace(/[?.!,]/g," ");
  const lex=lexicon(); const gl=[]; const verbs=[];
  const aux={"do":"","does":"","did":"","am":"","is":"","are":"","to":"","the":"","a":"","an":"","your":"YOU","me":"ME","you":"YOU","i":"ME","my":"ME"};
  for(const w of t.split(/\s+/).filter(Boolean)){
    if(aux[w]!==undefined){ if(aux[w]) gl.push(aux[w]); continue; }
    const g=wordToGloss(w);
    if(!g){ const f=w.replace(/ing$/,"").replace(/s$/,""); const g2=wordToGloss(f);
      if(g2){ if(lex[g2]&&lex[g2].pos==="v") verbs.push(g2); else gl.push(g2); } else gl.push(w); continue; }
    if(lex[g]&&lex[g].pos==="v") verbs.push(g); else gl.push(g);
  }
  gl.push(...verbs);
  return {glosses:gl,q,neg};
}
/* avatar caption: English sentence + gloss row with the word being signed highlighted */
let avSpans=[];
function avCaption(eng,glosses,append){
  const eEl=$("avCapEng"); eEl.textContent=eng||I18N.t("av_idle"); eEl.classList.toggle("idle",!eng);
  const w=$("avCapWords"); if(!append){ w.innerHTML=""; avSpans=[]; }
  glosses.forEach(g=>{ const sp=document.createElement("span"); sp.textContent=glossLabel(g); w.appendChild(sp); avSpans.push(sp); });
}
mainAvatar.onStep=cur=>{ avSpans.forEach((sp,i)=>sp.classList.toggle("on",!!cur&&cur.gi===i)); };
/* Voice to Sign with the REAL recorded signs from the trained model (pose_library.json).
   Used only when every word of the sentence has a recording; otherwise the built-in signs play. */
async function tryLibrarySign(text,speakIt){
  if(!mainAvatar.playSegments) return false;               /* needs the 3D avatar */
  try{
    const en=I18N.lang==="en"?text:await I18N.toEnglish(text);
    const tok=document.querySelector('meta[name="csrf-token"]');
    const r=await fetch("/api/signs_public",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":tok?tok.content:""},body:JSON.stringify({text:en,spell:LIBRARY_ONLY})});
    if(!r.ok) return false;
    const segs=(await r.json()).segments;
    if(!segs||!segs.length) return false;
    const names=segs.map(s=>s.label.toUpperCase());
    if(speakIt) speak(text);
    avCaption(text,names,false);
    mainAvatar.onEnd=()=>{ if($("loopAv").checked) mainAvatar.playSegments(segs); };
    mainAvatar.playSegments(segs);
    addMsg("me",text,names.join(" "),"text→sign");
    return true;
  }catch(e){ return false; }
}
async function signText(text,speakIt){
  if(await tryLibrarySign(text,speakIt)) return;
  mainAvatar.onEnd=null;
  const {glosses,q,neg}=await textToGlosses(text);
  const gl=glosses.length?glosses:["SORRY"];
  if(speakIt) speak(text);
  mainAvatar.loop=$("loopAv").checked;
  mainAvatar.onDone=async()=>{ const t=$("txtIn").value.trim(); if(t){ const r=await textToGlosses(t); avCaption(t,r.glosses.length?r.glosses:["SORRY"],false); mainAvatar.playGlosses(r.glosses.length?r.glosses:["SORRY"],r.q,r.neg);} };
  avCaption(text,gl,false);
  mainAvatar.playGlosses(gl,q,neg);
  addMsg("me",text,glosses.map(glossLabel).join(" ")+(q?" ❓":"")+(neg?" 🚫":""),"text→sign");
}
$("btnToSign").onclick=()=>{ const text=$("txtIn").value.trim(); if(!text) return; signText(text,true); };
$("btnStopAv").onclick=()=>{ stopMic(); mainAvatar.stop(); };
/* continuous microphone: keeps listening, every finished phrase is signed immediately */
let micOn=false, micRec=null, micChain=Promise.resolve();
function stopMic(){ micOn=false; try{ micRec&&micRec.stop(); }catch(e){} $("micTxt").textContent=I18N.t("b_mic"); $("btnMic").classList.remove("red"); }
$("btnMic").onclick=()=>{
  if(micOn){ stopMic(); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast(I18N.t("t_nomic")); return; }
  micOn=true; $("micTxt").textContent=I18N.t("mic_on"); $("btnMic").classList.add("red");
  $("txtIn").value=""; mainAvatar.loop=false;
  const start=()=>{
    const r=micRec=new SR(); r.lang=I18N.sr(); r.continuous=true; r.interimResults=true;
    r.onresult=e=>{
      let interim="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript.trim();
        if(e.results[i].isFinal){
          if(!t) continue;
          micChain=micChain.then(async()=>{ const res=await textToGlosses(t); const gl=res.glosses.length?res.glosses:["SORRY"];
          $("txtIn").value=($("txtIn").value+" "+t).trim();
          const first=!mainAvatar.playing;
          avCaption(t,gl,!first&&avSpans.length>0&&mainAvatar.playing);
          if(first) mainAvatar.playGlosses(gl,res.q,res.neg); else mainAvatar.enqueueGlosses(gl,res.q,res.neg);
          addMsg("me",t,gl.map(glossLabel).join(" ")+(res.q?" ❓":"")+(res.neg?" 🚫":""),"voice→sign"); });
        } else interim+=t+" ";
      }
      if(interim){ $("avCapEng").textContent=interim.trim()+" …"; $("avCapEng").classList.remove("idle"); }
    };
    r.onerror=e=>{ if(e.error==="not-allowed"||e.error==="service-not-allowed"){ toast(I18N.t("t_micdeny")); stopMic(); } };
    r.onend=()=>{ if(micOn){ try{ start(); }catch(e){ stopMic(); } } };   /* auto-restart when the browser times out */
    try{ r.start(); }catch(e){}
  };
  start();
};
function addMsg(who,raw,trans,mode){
  const b=document.createElement("div"); b.className="bubble "+(who==="me"?"me":"them");
  b.innerHTML=(who==="me"?"🧑 ":"🤟 ")+String(raw).replace(/</g,"&lt;")+'<span class="meta">'+mode+" → "+String(trans).replace(/</g,"&lt;")+"</span>";
  $("msglog").appendChild(b); $("msglog").scrollTop=1e6;
}
toast(I18N.t("t_welcome"));

/* ---------------- Language picker ---------------- */
(function(){
  const sel=$("langSel");
  Object.keys(I18N.LANGS).forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=I18N.LANGS[c].n; sel.appendChild(o); });
  sel.value=I18N.lang;
  sel.onchange=()=>{ stopMic(); try{ speechSynthesis.cancel(); }catch(e){} speakQ.length=0; speakBusy=false; I18N.setLang(sel.value); };
  window.addEventListener("langchange",()=>{
    pickVoice(); renderQuick(); renderChips(); renderCapWords();
    $("predBox").innerHTML="—<small>"+I18N.t("ph_pred")+"</small>";
    $("engTxt").textContent="—"; $("glossTxt").textContent="";
    $("micTxt").textContent=I18N.t("b_mic");
    $("txtIn").value=""; mainAvatar.stop(); $("avCapWords").innerHTML=""; avSpans=[];
    toast(I18N.LANGS[I18N.lang].n+" ✓");
  });
  I18N.applyLang();
})();
