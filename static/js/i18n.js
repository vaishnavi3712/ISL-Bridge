/* ISL Bridge: language layer.
   The English text lives in the page. Every other language is translated by the Flask backend
   (deep-translator) and cached in the browser and the database, so nothing is translated by hand here. */
"use strict";
const I18N=(()=>{
const EN=Object.fromEntries(Object.entries(window.UI_EN||{}).filter(([k,v])=>typeof v==="string")), LANGS=window.ISL_LANGS||{en:{n:"English",sr:"en-IN"}};
const csrf=()=>{ const m=document.querySelector('meta[name="csrf-token"]'); return m?m.content:""; };
const store={ get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
              set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };

/* ---------- talk to the backend ---------- */
async function tx(texts,lang,source){
  source=source||"en";
  if(!texts.length||lang===source) return texts;
  try{
    const r=await fetch("/api/translate",{method:"POST",
      headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify({texts,lang,source})});
    return r.ok?(await r.json()).texts:texts;
  }catch(e){ return texts; }
}

/* {name} placeholders are swapped for [0],[1]... so the translator leaves them alone */
const protect=s=>{ const names=[]; return {t:s.replace(/\{(\w+)\}/g,(m,n)=>"["+(names.push(n)-1)+"]"),names}; };
const restore=(s,names)=>names.every((n,i)=>s.includes("["+i+"]"))?s.replace(/\[(\d+)\]/g,(m,i)=>"{"+names[+i]+"}"):null;

/* ---------- vocabulary that comes from the other scripts ---------- */
const hasM=()=>typeof MEANINGS!=="undefined", hasL=()=>typeof BASE_LEX!=="undefined";
const glossKeys=()=>{ const s=new Set(hasM()?Object.keys(MEANINGS):[]); if(hasL()) Object.keys(BASE_LEX).forEach(k=>s.add(k)); return [...s]; };
const glossEnglish=g=>(hasM()&&MEANINGS[g]&&MEANINGS[g].m)||(hasL()&&BASE_LEX[g]&&BASE_LEX[g].w)||g.toLowerCase();
const hintKeys=()=>hasM()?Object.keys(MEANINGS).filter(g=>MEANINGS[g].h):[];
const version=()=>JSON.stringify(EN).length+"-"+glossKeys().length;

const UI={en:EN}, GL={}, HT={}, ready={};
let cur="en";

async function buildPack(c){
  const keys=Object.keys(EN), prot=keys.map(k=>protect(EN[k])), gl=glossKeys(), hk=hintKeys();
  const [ui,lab,hin]=await Promise.all([tx(prot.map(p=>p.t),c), tx(gl.map(glossEnglish),c), tx(hk.map(g=>MEANINGS[g].h),c)]);
  const pack={v:version(),ui:{},gl:{},ht:{},ok:ui.some((s,i)=>s!==prot[i].t)};
  keys.forEach((k,i)=>{ const r=prot[i].names.length?restore(ui[i],prot[i].names):ui[i]; pack.ui[k]=r||EN[k]; });
  gl.forEach((g,i)=>{ pack.gl[g]=lab[i]; }); hk.forEach((g,i)=>{ pack.ht[g]=hin[i]; });
  return pack;
}
async function ensure(c){
  if(c==="en"||ready[c]) return;
  let pack=store.get("isl_pack_"+c);
  if(!pack||pack.v!==version()){ pack=await buildPack(c); if(pack.ok) store.set("isl_pack_"+c,pack); }
  UI[c]=pack.ui; GL[c]=pack.gl; HT[c]=pack.ht; if(pack.ok) ready[c]=1;
}

/* ---------- lookups used by the app ---------- */
function t(k,vars){ let s=(UI[cur]&&UI[cur][k])||EN[k]||k; if(vars) s=s.replace(/\{(\w+)\}/g,(m,v)=>vars[v]); return s; }
const wordOf=g=>cur==="en"?null:((GL[cur]&&GL[cur][g])||null);
const hintOf=g=>cur==="en"?null:((HT[cur]&&HT[cur][g])||null);
const toEnglish=async text=>cur==="en"?text:(await tx([text],"en","auto"))[0];
const fromEnglish=async text=>cur==="en"?text:(await tx([text],cur))[0];

/* ---------- long English text and suggested sentences ---------- */
const AUTO="[data-auto],.tips li,.vid>span";
async function autoTranslate(root){
  const lang=cur, els=[...(root||document).querySelectorAll(AUTO)];
  els.forEach(e=>{ if(e.dataset.src===undefined){ e.dataset.src=e.dataset.en||e.textContent.trim(); e.dataset.html=e.innerHTML; } });
  if(lang==="en"){ els.forEach(e=>{ if(e.dataset.tr){ e.innerHTML=e.dataset.html; delete e.dataset.tr; } }); return; }   /* put the original markup back */
  const cache=store.get("isl_auto_"+lang)||{};
  const need=[...new Set(els.map(e=>e.dataset.src).filter(s=>s&&!(s in cache)))];
  if(need.length){ const out=await tx(need,lang); need.forEach((s,i)=>{ if(out[i]&&out[i]!==s) cache[s]=out[i]; }); store.set("isl_auto_"+lang,cache); }
  if(lang!==cur) return;
  els.forEach(e=>{ const t=cache[e.dataset.src]; if(t){ e.textContent=t; e.dataset.tr="1"; } });
}

function applyLang(){
  document.documentElement.lang=cur;
  document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent=t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{ el.placeholder=t(el.dataset.i18nPh); });
  const sel=document.getElementById("langSel"); if(sel&&sel.value!==cur) sel.value=cur;
  document.title=cur==="en"?"ISL Bridge":"ISL Bridge · "+LANGS[cur].n;
  autoTranslate();
}
function banner(msg){
  let b=document.getElementById("i18nBanner");
  if(!b){ b=document.createElement("div"); b.id="i18nBanner";
    b.style.cssText="position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;max-width:90vw;background:#7f1d1d;color:#fff;padding:10px 16px;border-radius:10px;font:14px system-ui;box-shadow:0 4px 18px rgba(0,0,0,.4);cursor:pointer";
    b.onclick=()=>b.remove(); document.body.appendChild(b); }
  b.textContent=msg; setTimeout(()=>{ if(b.parentNode) b.remove(); },12000);
}
async function setLang(c){
  if(!LANGS[c]) return;
  const sel=document.getElementById("langSel"); document.body.classList.add("i18n-busy"); if(sel) sel.disabled=true;
  try{ await ensure(c); } finally { document.body.classList.remove("i18n-busy"); if(sel) sel.disabled=false; }
  if(c!=="en"&&!ready[c]) banner("Could not translate the page into "+LANGS[c].n+". The translation service (Google) needs internet. Open /api/translate_status to check it, and look for 'translate failed' in the Terminal. (click to close)");
  cur=c; try{ localStorage.setItem("isl_lang",c); }catch(e){}
  applyLang(); window.dispatchEvent(new CustomEvent("langchange",{detail:c}));
}
function mountPicker(sel){
  Object.keys(LANGS).forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=LANGS[c].n; sel.appendChild(o); });
  sel.value=cur; sel.onchange=()=>setLang(sel.value);
}

/* first paint is English, then switch to the saved (or browser) language once every script has loaded */
let want="en"; try{ want=localStorage.getItem("isl_lang")||""; }catch(e){}
if(!LANGS[want]){ const nl=(navigator.language||"en").slice(0,2).toLowerCase(); want=LANGS[nl]?nl:"en"; }
window.addEventListener("load",()=>{ if(want!=="en") setLang(want); });

return {LANGS,t,wordOf,hintOf,setLang,applyLang,mountPicker,toEnglish,fromEnglish,tx,autoTranslate,
  get lang(){return cur;}, sr:()=>(LANGS[cur]||LANGS.en).sr, tts:()=>(LANGS[cur]||LANGS.en).sr};
})();
