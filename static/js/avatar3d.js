/* ================================================================
   Hana in 3D. Plays the same signs (LIB), finger-spelling (ABC) and player API
   as the 2D avatar in avatar.js, so lessons, quiz and the voice->sign screen all work unchanged.
   The arm positions come from the same keyframe angles; the 3D part adds depth, real fingers and lighting.
   It can also replay recorded hand keypoints (pose library from the trained model) via playSegments().
   Needs three.js (global THREE); if it is missing the site simply keeps the 2D avatar.
   ================================================================ */
"use strict";
(function(){
const want3d=(()=>{ try{ return localStorage.getItem("isl_avatar")!=="2d"; }catch(e){ return true; } })();
if(typeof THREE==="undefined"||typeof AvatarPlayer==="undefined"||!want3d){ window.AvatarClass=window.AvatarClass||AvatarPlayer; return; }

const S=0.0057, UPN=new THREE.Vector3(0,1,0);
const px=(x,y,z=0)=>new THREE.Vector3((x-210)*S,0.30+(163-y)*S,z);       // 2D avatar pixels -> 3D units
const mat=(c,r=.75)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const C={skin:0xe0a574,hair:0x2b1d1b,blouse:0xfff1d6,dress:0x6fa27f,ribbon:0xc0443f,eye:0x1d1411,bone:0xf0a202};
const _t=new THREE.Vector3();
function limb(m,a,b){ _t.subVectors(b,a); const l=_t.length()||1e-4; m.position.copy(a).addScaledVector(_t,.5);
  m.quaternion.setFromUnitVectors(UPN,_t.clone().normalize()); m.scale.y=l; }
function ik(sh,wr,l1,l2,pole){          // two-bone IK, returns elbow position
  const d=new THREE.Vector3().subVectors(wr,sh), len=Math.min(d.length(),l1+l2-.001); d.normalize();
  const a=(l1*l1-l2*l2+len*len)/(2*len), h=Math.sqrt(Math.max(l1*l1-a*a,0));
  const n=pole.clone().sub(d.clone().multiplyScalar(pole.dot(d))).normalize();
  return sh.clone().addScaledVector(d,a).addScaledVector(n,h);
}

/* ---------- parametric hand: palm, 4 fingers x 3 joints, thumb x 2 joints ---------- */
function makeHand(){
  const g=new THREE.Group(), skin=mat(C.skin), fingers=[];
  const palm=new THREE.Mesh(new THREE.BoxGeometry(.075,.085,.026),skin); palm.position.y=.0425; g.add(palm);
  const xs=[-.0285,-.0095,.0095,.0285], lens=[[.034,.026,.02],[.038,.028,.021],[.034,.026,.02],[.027,.02,.016]];
  xs.forEach((x,i)=>{
    const root=new THREE.Group(); root.position.set(x,.085,0); g.add(root);
    let parent=root; const js=[];
    lens[i].forEach(L=>{
      const j=new THREE.Group(); parent.add(j);
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.0075,.0085,L,8),skin); seg.position.y=L/2; j.add(seg);
      const tip=new THREE.Group(); tip.position.y=L; j.add(tip); js.push(j); parent=tip;
    });
    fingers.push({root,js});
  });
  const th=new THREE.Group(); th.position.set(-.04,.025,0); g.add(th);
  const t1=new THREE.Group(); th.add(t1);
  const a=new THREE.Mesh(new THREE.CylinderGeometry(.009,.01,.035,8),skin); a.position.y=.0175; t1.add(a);
  const t2=new THREE.Group(); t2.position.y=.035; t1.add(t2);
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.0075,.009,.03,8),skin); b.position.y=.015; t2.add(b);
  return {g,fingers,th,t1,t2};
}
const MAXC=[1.15,1.45,1.0];
function shapeHand(h,curls,thumb,spread=0){
  h.fingers.forEach((f,i)=>{ f.js.forEach((j,k)=>{ j.rotation.x=curls[i]*MAXC[k]; }); f.root.rotation.z=(i-1.5)*spread; });
  h.th.rotation.z=thumb[0]; h.t1.rotation.x=thumb[1]*.6; h.t2.rotation.x=thumb[1]*.9;
}
const EXT={open:[1,1,1,1],flat:[1,1,1,1],flatB:[1,1,1,1],point:[1,0,0,0],v:[1,1,0,0],claw:[.5,.5,.5,.5],hook:[.5,0,0,0],thumbs:[0,0,0,0],fist:[0,0,0,0],closed:[0,0,0,0],s:[0,0,0,0]};
const thumbFor=s=>s==="thumbs"?[0,0]:(["open","flat","flatB","v","point"].includes(s)?[.9,0]:[.25,.9]);
const TH={up:[0,0],in:[.2,1],out:[.95,0],touch:[.35,.7],front:[.15,.8],tuck:[.1,1.1]};
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

class Avatar3D extends AvatarPlayer{
  constructor(canvas,labelEl,statusEl){
    super(canvas,labelEl,statusEl);
    const c3=document.createElement("canvas"); c3.width=canvas.width; c3.height=canvas.height;
    canvas.style.display="none"; canvas.after(c3); this.cv3=c3;           // a canvas cannot hold both 2D and WebGL contexts
    this.r=new THREE.WebGLRenderer({canvas:c3,antialias:true,alpha:true});
    this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); this.r.setSize(canvas.width,canvas.height,false);
    this.scene=new THREE.Scene();
    this.cam=new THREE.PerspectiveCamera(32,canvas.width/canvas.height,.1,10); this.cam.position.set(0,.16,2.35); this.cam.lookAt(0,.14,0);
    this.scene.add(new THREE.HemisphereLight(0xfff6e5,0x7a8f7a,.85));
    const sun=new THREE.DirectionalLight(0xffffff,.9); sun.position.set(1.2,2,2.5); this.scene.add(sun);
    this.build(); this.kp=null; this.kpW=[new THREE.Vector3(),new THREE.Vector3()];
  }
  build(){
    const sc=this.scene, skin=mat(C.skin), blouse=mat(C.blouse), dress=mat(C.dress), hair=mat(C.hair,.9);
    const add=(geo,m,pos,parent=sc)=>{ const o=new THREE.Mesh(geo,m); o.position.copy(pos); parent.add(o); return o; };
    this.body=new THREE.Group(); sc.add(this.body);
    add(new THREE.CylinderGeometry(.17,.19,.42,24),blouse,new THREE.Vector3(0,.10,0),this.body);
    add(new THREE.CylinderGeometry(.19,.34,.5,28),dress,new THREE.Vector3(0,-.16,0),this.body);       // pinafore skirt
    add(new THREE.BoxGeometry(.2,.2,.03),dress,new THREE.Vector3(0,.16,.175),this.body);               // bib
    add(new THREE.CylinderGeometry(.045,.05,.1,12),skin,new THREE.Vector3(0,.33,0),this.body);        // neck
    // head
    this.head=new THREE.Group(); this.head.position.copy(px(210,134)); sc.add(this.head);
    const face=add(new THREE.SphereGeometry(.165,32,24),skin,new THREE.Vector3(),this.head); face.scale.set(1,1.08,.95);
    const back=add(new THREE.SphereGeometry(.185,28,20),hair,new THREE.Vector3(0,.01,-.03),this.head); back.scale.set(1,1.06,.92);
    const fringe=add(new THREE.SphereGeometry(.178,28,12,0,Math.PI*2,0,Math.PI*.46),hair,new THREE.Vector3(0,.02,.012),this.head); fringe.rotation.x=-.3;
    for(let i=0;i<5;i++) add(new THREE.SphereGeometry(.045-i*.004,12,10),hair,new THREE.Vector3(-.13-i*.004,-.13-i*.07,-.08),this.head);
    add(new THREE.SphereGeometry(.03,12,10),mat(C.ribbon),new THREE.Vector3(-.134,-.5,-.08),this.head);
    this.eyes=[-1,1].map(s=>{ const e=add(new THREE.SphereGeometry(.03,16,12),mat(C.eye,.3),new THREE.Vector3(s*.06,-.005,.145),this.head);
      e.scale.z=.5; add(new THREE.SphereGeometry(.009,8,8),new THREE.MeshBasicMaterial({color:0xffffff}),new THREE.Vector3(s*.052,.01,.17),this.head); return e; });
    this.brows=[-1,1].map(s=>add(new THREE.BoxGeometry(.05,.008,.008),hair,new THREE.Vector3(s*.06,.055,.158),this.head));
    [-1,1].forEach(s=>{ const b=add(new THREE.SphereGeometry(.026,10,8),new THREE.MeshBasicMaterial({color:0xf4a3a0,transparent:true,opacity:.45}),new THREE.Vector3(s*.095,-.04,.14),this.head); b.scale.z=.3; });
    const mm=mat(0x8f2f2c,.5), mg=new THREE.Group(); mg.position.set(0,-.075,.152); this.head.add(mg);
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.028,.004,6,14,Math.PI),mm); smile.rotation.z=Math.PI; smile.position.y=.012;
    const frown=new THREE.Mesh(new THREE.TorusGeometry(.028,.004,6,14,Math.PI),mm); frown.position.y=-.012;
    const flat=new THREE.Mesh(new THREE.BoxGeometry(.05,.006,.006),mm);
    const oo=new THREE.Mesh(new THREE.TorusGeometry(.011,.004,6,12),mm);
    this.mouths={smile,frown,flat,o:oo}; Object.values(this.mouths).forEach(m=>mg.add(m));
    // arms: index 0 = right side of the screen (ra), 1 = left (la)
    this.arms=[240,180].map((sx,i)=>{
      const sh=px(sx,163); add(new THREE.SphereGeometry(.052,14,12),blouse,sh);
      const up=add(new THREE.CylinderGeometry(.04,.036,1,12),blouse,new THREE.Vector3()), fo=add(new THREE.CylinderGeometry(.03,.026,1,12),skin,new THREE.Vector3());
      const elbow=add(new THREE.SphereGeometry(.036,12,10),blouse,new THREE.Vector3());
      const hand=makeHand(); sc.add(hand.g); if(i===1) hand.g.scale.x=-1;
      const kp=new THREE.Group(); sc.add(kp); kp.visible=false;
      const pts=Array.from({length:21},()=>add(new THREE.SphereGeometry(.011,8,8),mat(0xffffff),new THREE.Vector3(),kp));
      const bones=BONES.map(()=>add(new THREE.CylinderGeometry(.006,.006,1,6),mat(C.bone),new THREE.Vector3(),kp));
      return {sh,up,fo,elbow,hand,kp,pts,bones};
    });
  }
  setArm(a,el,wr){
    limb(a.up,a.sh,el); limb(a.fo,el,wr); a.elbow.position.copy(el);
    const d=new THREE.Vector3().subVectors(wr,el).normalize();
    a.hand.g.position.copy(wr); a.hand.g.quaternion.setFromUnitVectors(UPN,d);
    a.kp.position.copy(wr);
  }
  alive(T){                                        // breathing, blinking, head tilt
    this.body.scale.y=1+Math.sin(T*1.6)*.006; this.head.position.y=px(210,134).y+Math.sin(T*1.6)*.004;
    const k=T%3.8, bl=k<.14?Math.sin(k/.14*Math.PI):0; this.eyes.forEach(e=>{ e.scale.y=1-bl*.9; });
  }
  face3(p){
    this.head.rotation.z=-(p.head||0)*.012;
    Object.entries(this.mouths).forEach(([k,m])=>{ m.visible=k===(p.mouth==="smile"?"smile":p.mouth==="frown"?"frown":p.mouth==="o"?"o":"flat"); });
    this.brows.forEach((b,i)=>{ const s=i?1:-1; b.position.y=.055+(p.brow==="up"?.022:p.brow==="down"?-.012:0); b.rotation.z=p.brow==="down"?s*.28:p.brow==="up"?-s*.1:0; });
  }
  applyPose(p){
    this.face3(p); this.showKP(false);
    [["ra",240],["la",180]].forEach(([k,sx],i)=>{
      const [e,w]=armPoints(sx,163,p[k][0],p[k][1]);
      const el=px(e[0],e[1],.09), wr=px(w[0],w[1],.19), a=this.arms[i];
      this.setArm(a,el,wr);
      const ext=EXT[p.hand]||EXT.open; shapeHand(a.hand,ext.map(x=>1-x),thumbFor(p.hand));
      a.hand.g.rotation.z=0;
    });
  }
  spell(ch,ph){
    const cfg=ABC[ch]||{f:[1,1,1,1],t:"in"}; this.face3({mouth:"smile",brow:"flat"}); this.showKP(false);
    const a=this.arms[0], b=this.arms[1];
    this.setArm(b,px(184,211,.09),px(176,255,.12)); shapeHand(b.hand,[.3,.3,.3,.3],[.2,.6]);      // resting hand
    const wr=new THREE.Vector3(.12,.30,.30), el=ik(a.sh,wr,.296,.274,new THREE.Vector3(.35,-1,.1));
    this.setArm(a,el,wr);
    shapeHand(a.hand,cfg.f.map(v=>Math.max(-.2,Math.min(1,v))),TH[cfg.t]||TH.in,cfg.spread?.18:0);
    const wig=cfg.sweep?Math.sin(ph*Math.PI)*.7:(cfg.zig?(ph<.33?-.5:ph<.66?.5:-.2):0);
    a.hand.g.quaternion.identity(); a.hand.g.rotation.z=(cfg.side?Math.PI/2:0)+(cfg.down?Math.PI:0)+wig;
    a.hand.g.position.copy(wr);
  }
  /* ---- replay recorded hand keypoints (pose library) ---- */
  showKP(on){ this.arms.forEach(a=>{ const k=on&&!!a.kp.userData.has; a.kp.visible=k; a.hand.g.visible=!k; }); }
  drawKP(f,w){
    this.face3({mouth:"flat",brow:"flat"});
    const slots=[0,1].map(s=>f.slice(s*63,s*63+63)).map((v,s)=>({v,s,has:v.some(x=>x)}));
    const used=slots.filter(s=>s.has);
    this.arms.forEach(a=>{ a.kp.userData.has=false; });
    used.forEach(o=>{
      let idx; const wx=w?w[o.s*3]:.5;
      idx=used.length===2?(o.s===0?1:0):(wx<.5?1:0);
      const a=this.arms[idx], target=new THREE.Vector3((wx-.5)*1.0,w?.45-(w[o.s*3+1]-.2)*1.1:.1,.28);
      const tgt=this.kpW[idx]; tgt.lerp(target,.6);
      const el=ik(a.sh,tgt,.296,.274,new THREE.Vector3(idx?-.35:.35,-1,-.2)); this.setArm(a,el,tgt);
      a.kp.userData.has=true;
      a.pts.forEach((p,k)=>p.position.set(o.v[k*3]*.2,-o.v[k*3+1]*.2,-o.v[k*3+2]*.2));
      BONES.forEach(([p,q],k)=>limb(a.bones[k],a.pts[p].position,a.pts[q].position));
    });
    this.arms.forEach((a,i)=>{ if(!a.kp.userData.has){ this.setArm(a,px(i?168:252,208,.08),px(i?160:260,252,.1)); shapeHand(a.hand,[.3,.3,.3,.3],[.2,.6]); } });
    this.showKP(true);
  }
  playSegments(segs){
    this.stop(false); this.queue=[]; this.kp={segs,i:0,t0:performance.now()}; this.playing=true;
    if(this.statusEl) this.statusEl.textContent="signing…";
  }
  stop(redraw=true){ this.kp=null; super.stop(redraw); }
  tick(){
    if(this.cv3.offsetParent===null) return;
    const now=performance.now(); this.alive(now/1000);
    if(this.kp){
      const k=this.kp, seg=k.segs[k.i];
      if(!seg){ this.kp=null; this.playing=false; if(this.labelEl) this.labelEl.textContent="—"; if(this.onEnd) this.onEnd(); this.showKP(false); }
      else {
        const fi=Math.floor((now-k.t0)/70*this.speed);
        if(this.labelEl) this.labelEl.textContent=seg.label;
        if(fi>=seg.frames.length+4){ k.i++; k.t0=now; }
        else { const n=Math.min(fi,seg.frames.length-1); this.drawKP(seg.frames[n],seg.wrists&&seg.wrists[n]); }
      }
    } else {
      let pose=this.idle, spell=null;
      if(this.cur){
        const c=this.cur, el=(now-this.t0)*this.speed;
        if(c.type==="sign"){
          const kf=c.kf, total=kf.reduce((s,x)=>s+x.ms,0);
          if(el>=total){ this.next(); return; }
          let acc=0;
          for(let i=0;i<kf.length;i++){ if(el<acc+kf[i].ms){ pose=lerpPose(kf[i].pose,kf[(i+1)%kf.length].pose,(el-acc)/kf[i].ms); break; } acc+=kf[i].ms; }
        } else if(c.type==="spell"){
          if(el>=650){ this.next(); return; } spell={ch:c.ch,ph:(el%650)/650};
        } else {
          const t=Math.min(1,el/900); if(el>=900){ this.next(); return; }
          pose=P([0,90],[0,90],{brow:t>.2&&t<.8?"up":"flat",mouth:"o"});
        }
      }
      if(spell) this.spell(spell.ch,spell.ph); else this.applyPose(pose);
    }
    this.r.render(this.scene,this.cam);
  }
}
window.Avatar3D=Avatar3D; window.AvatarClass=Avatar3D;

})();
/* header toggle: 3D <-> 2D (reloads so every avatar on the page switches together) */
document.addEventListener("DOMContentLoaded",()=>{
  const b=document.getElementById("btnAv"); if(!b) return;
  let is3d=true; try{ is3d=localStorage.getItem("isl_avatar")!=="2d"; }catch(e){}
  b.textContent=(window.Avatar3D&&is3d)?"3D":"2D";
  b.onclick=()=>{ try{ localStorage.setItem("isl_avatar",is3d?"2d":"3d"); }catch(e){} location.reload(); };
});
