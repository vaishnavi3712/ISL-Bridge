/* ================================================================
   ISL Bridge — Avatar engine (reusable player: signer / lessons / quiz)
   ================================================================ */
"use strict";

/* pose = {ra:[shoulderDeg,elbowDeg], la:[...], mouth, brow, hand, head} */
const P=(ra,la,o={})=>({ra,la,mouth:o.mouth||"flat",brow:o.brow||"flat",hand:o.hand||"open",head:o.head||0});
const K=(pose,ms)=>({pose,ms});

/* Keyframe library: each sign = sequence of poses over time (ms) */
const LIB={
  HELLO:[K(P([-20,40],[20,40],{hand:"open",mouth:"smile",brow:"up"}),250),K(P([-60,70],[20,40],{hand:"open",mouth:"smile"}),200),K(P([20,70],[20,40],{hand:"open",mouth:"smile"}),200),K(P([-60,70],[20,40],{hand:"open",mouth:"smile"}),200),K(P([20,70],[20,40],{hand:"open",mouth:"smile",brow:"up"}),250)],
  ME:[K(P([0,90],[0,90]),220),K(P([-15,125],[0,90],{hand:"flat",mouth:"flat"}),380),K(P([0,90],[0,90]),200)],
  YOU:[K(P([0,90],[0,90]),200),K(P([0,10],[0,90],{hand:"point"}),500),K(P([0,90],[0,90]),150)],
  WATER:[K(P([-40,130],[0,90],{hand:"flat"}),250),K(P([-15,115],[0,90],{hand:"flat",mouth:"o"}),250),K(P([-40,130],[0,90],{hand:"flat"}),250),K(P([-15,115],[0,90],{hand:"flat",mouth:"o"}),250)],
  FOOD:[K(P([-35,130],[0,90],{hand:"flat"}),240),K(P([-10,145],[0,90],{hand:"flat",mouth:"o"}),220),K(P([-35,130],[0,90],{hand:"flat"}),220),K(P([-10,145],[0,90],{hand:"flat",mouth:"o"}),220)],
  EAT:[K(P([-35,130],[0,90],{hand:"flat"}),240),K(P([-10,145],[0,90],{hand:"flat",mouth:"o"}),220),K(P([-35,130],[0,90],{hand:"flat"}),220),K(P([-10,145],[0,90],{hand:"flat",mouth:"o"}),220)],
  DRINK:[K(P([-45,105],[0,90],{hand:"closed"}),300),K(P([-70,95],[0,90],{hand:"closed",mouth:"o",head:-8}),450),K(P([-45,105],[0,90],{hand:"closed"}),200)],
  WANT:[K(P([40,110],[-40,110],{hand:"claw"}),250),K(P([-10,130],[10,130],{hand:"claw",mouth:"o"}),550),K(P([40,110],[-40,110],{hand:"claw"}),250)],
  GO:[K(P([0,90],[0,90]),220),K(P([0,40],[0,90],{hand:"flat"}),260),K(P([0,5],[0,90],{hand:"flat"}),420),K(P([0,90],[0,90]),180)],
  HOME:[K(P([-35,125],[0,90],{hand:"flat"}),250),K(P([-30,95],[0,90],{hand:"flat",mouth:"smile"}),250),K(P([-35,125],[0,90],{hand:"flat"}),250),K(P([-30,95],[0,90],{hand:"flat",mouth:"smile"}),250)],
  NAME:[K(P([-30,125],[-30,125],{hand:"flatB"}),250),K(P([-15,145],[-35,115],{hand:"flatB"}),300),K(P([-30,125],[-30,125],{hand:"flatB"}),300),K(P([-15,145],[-35,115],{hand:"flatB"}),300)],
  HELP:[K(P([-20,125],[0,90],{hand:"fist"}),250),K(P([-20,90],[0,90],{hand:"fist",brow:"up"}),600),K(P([-20,125],[0,90],{hand:"fist"}),200)],
  GOOD:[K(P([-15,120],[0,90],{hand:"thumbs",mouth:"smile"}),400),K(P([-25,90],[0,90],{hand:"thumbs",mouth:"smile"}),400),K(P([-15,120],[0,90],{hand:"thumbs",mouth:"smile"}),300)],
  THANK:[K(P([0,90],[0,90]),200),K(P([-20,125],[0,90],{hand:"flat",mouth:"smile"}),350),K(P([-40,110],[0,90],{hand:"flat",mouth:"smile"}),350)],
  YES:[K(P([0,90],[0,90],{hand:"fist"}),220),K(P([-8,120],[0,90],{hand:"fist"}),350),K(P([8,120],[0,90],{hand:"fist"}),350),K(P([0,90],[0,90],{hand:"fist"}),180)],
  NO:[K(P([0,90],[0,90],{hand:"point",head:-6}),250),K(P([0,90],[0,90],{hand:"point",head:6,brow:"down",mouth:"frown"}),250),K(P([0,90],[0,90],{hand:"point",head:-6}),250),K(P([0,90],[0,90],{hand:"point",head:6,brow:"down",mouth:"frown"}),250)],
  WHAT:[K(P([55,110],[-55,110],{hand:"open",brow:"up",mouth:"o"}),300),K(P([75,110],[-75,110],{hand:"open",brow:"up",mouth:"o"}),250),K(P([55,110],[-55,110],{hand:"open",brow:"up",mouth:"o"}),250)],
  WHERE:[K(P([55,110],[-55,110],{hand:"open",brow:"up",mouth:"o"}),300),K(P([75,110],[-75,110],{hand:"open",brow:"up",mouth:"o"}),250),K(P([55,110],[-55,110],{hand:"open",brow:"up",mouth:"o"}),250)],
  WHO:[K(P([0,90],[0,90],{hand:"point",brow:"up"}),250),K(P([25,60],[0,90],{hand:"point",brow:"up"}),250),K(P([0,90],[0,90],{hand:"point",brow:"up"}),250)],
  LIKE:[K(P([30,110],[-30,110],{hand:"flat"}),300),K(P([12,125],[8,125],{hand:"flat",mouth:"smile"}),500),K(P([30,110],[-30,110],{hand:"flat"}),200)],
  SEE:[K(P([-45,105],[0,90],{hand:"v"}),300),K(P([-20,115],[0,90],{hand:"v"}),500),K(P([-45,105],[0,90],{hand:"v"}),200)],
  MILK:[K(P([-30,125],[-30,125],{hand:"s",mouth:"o"}),300),K(P([-10,140],[-40,110],{hand:"s",mouth:"o"}),300),K(P([-30,125],[-30,125],{hand:"s",mouth:"o"}),300),K(P([-10,140],[-40,110],{hand:"s",mouth:"o"}),300)],
  TEA:[K(P([-40,130],[0,90],{hand:"fist",mouth:"o"}),300),K(P([-15,115],[0,90],{hand:"fist",mouth:"o"}),300),K(P([-40,130],[0,90],{hand:"fist",mouth:"o"}),300),K(P([-15,115],[0,90],{hand:"fist",mouth:"o"}),300)],
  SCHOOL:[K(P([-40,120],[-40,120],{hand:"flatB"}),250),K(P([-40,80],[-40,80],{hand:"flatB"}),500),K(P([-40,120],[-40,120],{hand:"flatB"}),250)],
  BOOK:[K(P([-35,115],[35,115],{hand:"flatB"}),300),K(P([-15,130],[15,130],{hand:"flatB"}),500),K(P([-35,115],[35,115],{hand:"flatB"}),200)],
  MORNING:[K(P([-30,125],[0,90],{hand:"flat"}),250),K(P([-30,60],[0,90],{hand:"flat",mouth:"smile"}),550),K(P([-30,125],[0,90],{hand:"flat"}),200)],
  TRAIN:[K(P([-30,120],[-30,120],{hand:"fist"}),280),K(P([-60,110],[-60,110],{hand:"fist"}),280),K(P([-30,120],[-30,120],{hand:"fist"}),280),K(P([-60,110],[-60,110],{hand:"fist"}),280)],
  BUS:[K(P([-30,110],[-30,110],{hand:"flat",mouth:"o"}),400),K(P([-30,110],[-30,110],{hand:"flat",mouth:"flat"}),200),K(P([-30,110],[-30,110],{hand:"flat",mouth:"o"}),300)],
  HOSPITAL:[K(P([-20,120],[-20,120],{hand:"flatB",brow:"up"}),350),K(P([-20,100],[-20,100],{hand:"flatB",brow:"up"}),350),K(P([-20,120],[-20,120],{hand:"flatB",brow:"up"}),350)],
  SORRY:[K(P([-15,120],[0,90],{hand:"flat",mouth:"frown"}),300),K(P([-30,110],[0,90],{hand:"flat",mouth:"frown",brow:"down"}),450),K(P([-15,120],[0,90],{hand:"flat"}),200)],
  PLEASE:[K(P([-40,115],[-40,115],{hand:"flat",mouth:"smile"}),300),K(P([-25,130],[-25,130],{hand:"flat",mouth:"smile"}),300),K(P([-40,115],[-40,115],{hand:"flat",mouth:"smile"}),300),K(P([-25,130],[-25,130],{hand:"flat",mouth:"smile"}),300)],
  FINE:[K(P([-15,120],[0,90],{hand:"thumbs",mouth:"smile"}),400),K(P([-25,90],[0,90],{hand:"thumbs",mouth:"smile"}),400)],
  FRIEND:[K(P([20,110],[-20,110],{hand:"hook"}),300),K(P([0,125],[0,125],{hand:"hook",mouth:"smile"}),500),K(P([20,110],[-20,110],{hand:"hook"}),200)],
  COME:[K(P([40,110],[0,90],{hand:"claw"}),250),K(P([10,125],[0,90],{hand:"claw",mouth:"o"}),550),K(P([40,110],[0,90],{hand:"claw"}),250)],
  GIVE:[K(P([10,125],[0,90],{hand:"flat"}),250),K(P([-35,115],[0,90],{hand:"flat",mouth:"o"}),550),K(P([10,125],[0,90],{hand:"flat"}),250)],
  LEARN:[K(P([-30,120],[-30,120],{hand:"flatB"}),250),K(P([-30,80],[-30,80],{hand:"flatB"}),400),K(P([-30,120],[-30,120],{hand:"flatB"}),250),K(P([-30,80],[-30,80],{hand:"flatB"}),400)]
};

/* Meaning + memory hint for every sign (used by Learn & Quiz) */
const MEANINGS={
  HELLO:{m:"hello",h:"Open hand. Wave it beside your head, like saying hi from far away."},
  ME:{m:"me / I",h:"Point your thumb at your own chest."},
  YOU:{m:"you",h:"Point your index finger straight at the person."},
  WATER:{m:"water",h:"Flat hand taps your chin twice — like water dripping."},
  FOOD:{m:"food",h:"Fingers bunched together touch your mouth — putting food in."},
  EAT:{m:"eat",h:"Same as FOOD — hand to mouth, like eating."},
  DRINK:{m:"drink",h:"Hand shaped like holding a cup tips towards your mouth."},
  WANT:{m:"want",h:"Both hands in claw shape pull towards your chest — pulling the wish in."},
  GO:{m:"go",h:"Hand slices forward away from your body — moving off."},
  HOME:{m:"home",h:"Flat hand touches your cheek, then moves down — like roof to wall."},
  NAME:{m:"name",h:"Tap the side of your fist into your open palm twice."},
  HELP:{m:"help",h:"Fist sits on open palm, then both rise up together — lifting someone."},
  GOOD:{m:"good",h:"Smile! One hand moves from your chin forward — good feelings flowing out."},
  THANK:{m:"thank you",h:"Flat hand moves from your chin forward to the person."},
  YES:{m:"yes",h:"Make a fist and nod it up and down, like your head saying yes."},
  NO:{m:"no",h:"Shake your head while your fingers snap shut — a firm no."},
  WHAT:{m:"what",h:"Raise your eyebrows! Both open hands flip palms-up."},
  WHERE:{m:"where",h:"Same as WHAT — raised eyebrows + palms asking ‘where?’."},
  WHO:{m:"who",h:"Point, then sweep sideways — eyebrows up means it’s a question."},
  LIKE:{m:"like",h:"Thumb and finger pull from your chest out — pulling liking from the heart."},
  SEE:{m:"see",h:"Two fingers point from your eyes forward — what the eyes catch."},
  MILK:{m:"milk",h:"Both hands squeeze like milking a cow, one after the other."},
  TEA:{m:"tea",h:"Fist like holding a cup, tips side to side — stirring chai."},
  SCHOOL:{m:"school",h:"Both flat hands clap together twice — like a teacher clapping."},
  BOOK:{m:"book",h:"Hands open and close together like turning pages."},
  MORNING:{m:"morning",h:"Flat hand rises up from your chest — the sun coming up."},
  TRAIN:{m:"train",h:"Fists move forward in turns — wheels running on a track."},
  BUS:{m:"bus",h:"Hands steering a big wheel — driving the bus."},
  HOSPITAL:{m:"hospital",h:"Fingers trace a cross on your arm — the medical sign."},
  SORRY:{m:"sorry",h:"Sad face, flat hand rubs a circle on your chest — regret."},
  PLEASE:{m:"please",h:"Flat hand rubs your chest in a circle, with a kind face."},
  FINE:{m:"fine / okay",h:"Thumbs up, moving slightly — all is well."},
  FRIEND:{m:"friend",h:"Hooked index fingers link and pull apart — two people connected."},
  COME:{m:"come",h:"Claw hand pulls towards you — calling someone over."},
  GIVE:{m:"give",h:"Flat hand moves from you outward — handing something over."},
  LEARN:{m:"learn",h:"Flat hand catches knowledge from your open palm — collecting it."}
};

/* One-hand manual alphabet: finger bends per letter */
const ABC={
  a:{f:[1,1,1,1],t:"up"},b:{f:[0,0,0,0],t:"in"},c:{f:[.5,.5,.5,.5],t:"out",curve:1},d:{f:[0,1,1,1],t:"touch"},
  e:{f:[1,1,1,1],t:"front"},f:{f:[.6,0,0,0],t:"touch"},g:{f:[0,1,1,1],t:"in",side:1},h:{f:[0,0,1,1],t:"in",side:1},
  i:{f:[1,1,1,0],t:"in"},j:{f:[1,1,1,0],t:"in",sweep:1},k:{f:[0,0,1,1],t:"up"},l:{f:[0,1,1,1],t:"out"},
  m:{f:[1,1,1,1],t:"tuck"},n:{f:[1,1,1,1],t:"tuck"},o:{f:[1,1,1,1],t:"out",curve:1},p:{f:[0,0,1,1],t:"in",side:1,down:1},
  q:{f:[0,1,1,1],t:"in",side:1,down:1},r:{f:[-.2,0,1,1],t:"in",cross:1},s:{f:[1,1,1,1],t:"front"},
  t:{f:[1,1,1,1],t:"up"},u:{f:[0,0,1,1],t:"in"},v:{f:[0,0,1,1],t:"in",spread:1},w:{f:[0,0,0,1],t:"in"},
  x:{f:[.5,1,1,1],t:"in"},y:{f:[1,1,1,0],t:"out",thumbOut:1},z:{f:[0,1,1,1],t:"in",zig:1}
};

function lerpPose(a,b,t){
  const L=(x,y)=>x+(y-x)*t;
  return {ra:[L(a.ra[0],b.ra[0]),L(a.ra[1],b.ra[1])],la:[L(a.la[0],b.la[0]),L(a.la[1],b.la[1])],
    mouth:t<.5?a.mouth:b.mouth,brow:t<.5?a.brow:b.brow,hand:t<.5?a.hand:b.hand,head:L(a.head||0,b.head||0)};
}
function armPoints(sx,sy,ang,elb){
  const a1=(ang-90)*Math.PI/180, ux=sx+Math.cos(a1)*52, uy=sy+Math.sin(a1)*52;
  const a2=a1+elb*Math.PI/180;
  return [[ux,uy],[ux+Math.cos(a2)*48,uy+Math.sin(a2)*48]];
}
/* ================================================================
   Ghibli-inspired painterly avatar "Hana"
   soft watercolour sky, drifting clouds, meadow, warm outlines,
   big expressive eyes, braid & pinafore — drawn 100% in canvas.
   ================================================================ */
const GH={line:"#5a3a2e",skin:"#e0a574",skinHi:"#f2c79d",skinSh:"#c2845a",hair:"#2b1d1b",hairHi:"#6a4a40",
  blouse:"#fff3df",blouseSh:"#e6d3b3",dress:"#3f9a8f",dressSh:"#2c746b",dressHi:"#63bcab",ribbon:"#dc4f4a",sock:"#fff8ec",shoe:"#8b5a3c"};
function rng(seed){ let s=seed; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }

/* ---- cached painted backdrop (sky + hills/meadow) ---- */
const _bd={};
function backdrop(W,H){
  const key=W+"x"+H; if(_bd[key]) return _bd[key];
  const mk=()=>{ const cv=document.createElement("canvas"); cv.width=W; cv.height=H; return cv; };
  const sx=W/420, sy=H/380;
  /* sky */
  const sky=mk(), a=sky.getContext("2d");
  let g=a.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#7fc4e8"); g.addColorStop(.55,"#bfe6f2"); g.addColorStop(1,"#fff1cf");
  a.fillStyle=g; a.fillRect(0,0,W,H);
  g=a.createRadialGradient(W*.8,H*.16,2,W*.8,H*.16,W*.42);
  g.addColorStop(0,"rgba(255,248,205,.95)"); g.addColorStop(.35,"rgba(255,244,190,.45)"); g.addColorStop(1,"rgba(255,244,190,0)");
  a.fillStyle=g; a.fillRect(0,0,W,H);
  /* hills + meadow */
  const hl=mk(), h=hl.getContext("2d"); h.scale(sx,sy);
  const hill=(y,amp,col1,col2,ph)=>{ const gg=h.createLinearGradient(0,y-amp,0,380); gg.addColorStop(0,col1); gg.addColorStop(1,col2);
    h.fillStyle=gg; h.beginPath(); h.moveTo(0,380); h.lineTo(0,y);
    for(let x=0;x<=420;x+=10) h.lineTo(x,y-Math.sin(x/420*Math.PI*1.6+ph)*amp);
    h.lineTo(420,380); h.closePath(); h.fill(); };
  hill(250,26,"#a9d89a","#86c27d",0.4);
  hill(278,22,"#7cc272","#58a560",2.1);
  /* small tree on far hill */
  h.fillStyle="#6b4a35"; h.fillRect(344,206,5,26);
  [[346,198,17],[336,208,12],[357,209,12]].forEach(([x,y,r])=>{ h.fillStyle="#4f9a5a"; h.beginPath(); h.arc(x,y,r,0,7); h.fill(); h.fillStyle="rgba(190,235,150,.35)"; h.beginPath(); h.arc(x-3,y-4,r*.6,0,7); h.fill(); });
  hill(318,14,"#5aaa5e","#3f8d4c",4.3);
  const R=rng(7);
  for(let i=0;i<90;i++){ const x=R()*420, y=300+R()*80; h.strokeStyle=R()>.5?"rgba(120,200,110,.8)":"rgba(40,120,70,.55)"; h.lineWidth=1.3;
    h.beginPath(); h.moveTo(x,y); h.quadraticCurveTo(x+2,y-5,x+R()*6-3,y-9-R()*4); h.stroke(); }
  const FC=["#ffffff","#ffd6e0","#fff2a8","#ffffff"];
  for(let i=0;i<26;i++){ const x=R()*420, y=322+R()*54; h.fillStyle=FC[i%4]; h.beginPath(); h.arc(x,y,2.1,0,7); h.fill(); h.fillStyle="#f6b73c"; h.beginPath(); h.arc(x,y,.8,0,7); h.fill(); }
  /* soft vignette */
  const vg=h.createRadialGradient(210,190,120,210,190,300); vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(40,60,40,.22)");
  h.fillStyle=vg; h.fillRect(0,0,420,380);
  return _bd[key]={sky,hills:hl};
}
/* ---- drifting cumulus clouds (Ghibli signature) ---- */
function drawClouds(c,W,H,T){
  const s=W/420;
  const CL=[[60,60,1.0,5],[250,38,1.25,3.2],[360,98,.75,4.2]];
  CL.forEach(([bx,by,sc,sp])=>{
    const x=((bx+T*sp)%(520))-70;
    c.save(); c.translate(x*s,by*s*(H/W)*(420/380)); c.scale(sc*s,sc*s);
    const blobs=[[0,0,20],[22,-9,26],[48,-3,22],[70,2,17],[26,6,20],[48,8,18]];
    c.fillStyle="rgba(150,185,208,.55)"; blobs.forEach(([x,y,r])=>{ c.beginPath(); c.arc(x,y+5,r,0,7); c.fill(); });
    c.fillStyle="#ffffff"; blobs.forEach(([x,y,r])=>{ c.beginPath(); c.arc(x,y,r,0,7); c.fill(); });
    c.fillStyle="rgba(255,255,255,.9)"; c.beginPath(); c.arc(22,-14,14,0,7); c.fill();
    c.restore(); });
}
/* ---- floating seeds / light motes ---- */
function drawMotes(c,W,H,T){
  const s=W/420; c.save(); c.fillStyle="rgba(255,255,255,.75)";
  for(let i=0;i<9;i++){ const x=((i*53+T*(6+i%3*3))%460)-20, y=330-((i*41+T*(9+i%4*3))%250)+Math.sin(T+i)*6;
    c.globalAlpha=.35+.35*Math.sin(T*1.3+i); c.beginPath(); c.arc(x*s,y*s,1.4*s,0,7); c.fill(); }
  c.restore();
}
/* ---- helpers ---- */
function limb(c,x1,y1,x2,y2,w,col,out){
  c.lineCap="round"; c.strokeStyle=out||GH.line; c.lineWidth=w+2.4; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
  c.strokeStyle=col; c.lineWidth=w; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
}
function blink(T){ const k=(T%3.8); return k<.14? Math.sin(k/.14*Math.PI):0; }

/* ---- Ghibli hand: soft outline, rounded fingers, drawn upright then rotated along the forearm ---- */
function drawHumanHand(c,x,y,shape,rot,mirror){
  c.save(); c.translate(x,y); c.rotate(rot||0); if(mirror) c.scale(-1,1); c.scale(1.3,1.3);
  const ext={open:[1,1,1,1],flat:[1,1,1,1],flatB:[1,1,1,1],point:[1,0,0,0],v:[1,1,0,0],claw:[.5,.5,.5,.5],hook:[.5,0,0,0],thumbs:[0,0,0,0],fist:[0,0,0,0],closed:[0,0,0,0],s:[0,0,0,0]};
  const cfg=ext[shape]||ext.open, xs=[-6.2,-2.1,2.1,6.2];
  c.lineCap="round"; c.lineJoin="round";
  /* thumb (behind palm) */
  let t;
  if(shape==="thumbs") t=[-7,3,-8.5,-13]; else if(["open","flat","flatB","v","point"].includes(shape)) t=[-7,3,-14,8]; else t=[-7,4,-10,8];
  c.strokeStyle=GH.line; c.lineWidth=5.6; c.beginPath(); c.moveTo(t[0],t[1]); c.lineTo(t[2],t[3]); c.stroke();
  c.strokeStyle=GH.skin; c.lineWidth=3.6; c.beginPath(); c.moveTo(t[0],t[1]); c.lineTo(t[2],t[3]); c.stroke();
  /* fingers */
  for(let i=0;i<4;i++){
    const e=cfg[i], fx=xs[i], fy=-5;
    if(e>.05){ const L=13.5*Math.min(1,Math.max(.2,e));
      c.strokeStyle=GH.line; c.lineWidth=5.4; c.beginPath(); c.moveTo(fx,fy); c.lineTo(fx,fy-L); c.stroke();
      c.strokeStyle=GH.skin; c.lineWidth=3.5; c.beginPath(); c.moveTo(fx,fy); c.lineTo(fx,fy-L); c.stroke();
      c.strokeStyle=GH.skinHi; c.lineWidth=1.1; c.beginPath(); c.moveTo(fx-.8,fy-2); c.lineTo(fx-.8,fy-L+1.5); c.stroke();
    } else { c.fillStyle=GH.skin; c.strokeStyle=GH.line; c.lineWidth=1.1; c.beginPath(); c.arc(fx,fy-1.6,3.1,0,7); c.fill(); c.stroke(); }
  }
  /* palm */
  const pg=c.createLinearGradient(-9,-6,9,12); pg.addColorStop(0,GH.skinHi); pg.addColorStop(1,GH.skin);
  c.fillStyle=pg; c.strokeStyle=GH.line; c.lineWidth=1.1;
  c.beginPath(); c.ellipse(0,2.5,9.4,9.6,0,0,7); c.fill(); c.stroke();
  /* thumb base overlap */
  c.fillStyle=GH.skin; c.beginPath(); c.arc(-7,4,3,0,7); c.fill();
  c.restore();
}

/* ---- the character ---- */
function drawPoseOn(c,W,H,p){
  const T=performance.now()/1000;
  c.clearRect(0,0,W,H);
  const bd=backdrop(W,H);
  c.drawImage(bd.sky,0,0); drawClouds(c,W,H,T); c.drawImage(bd.hills,0,0); drawMotes(c,W,H,T);
  const s=W/420;
  c.save(); c.translate(W/2,0); c.scale(s,s); c.translate(-210,0);
  c.lineJoin="round";
  const bob=Math.sin(T*1.9)*1.1;
  const hy=104;
  /* ground shadow */
  c.fillStyle="rgba(30,70,40,.28)"; c.beginPath(); c.ellipse(210,327,50,7,0,0,7); c.fill();
  /* legs, socks, shoes */
  [[198,193],[222,227]].forEach(([tx,bx])=>{
    limb(c,tx,255,bx,306,9.5,GH.skin);
    limb(c,bx,301,bx,313,10.5,GH.sock);
    c.fillStyle=GH.shoe; c.strokeStyle=GH.line; c.lineWidth=1.3; c.beginPath(); c.ellipse(bx+(bx<210?-2:2),321,13.5,6.6,0,0,7); c.fill(); c.stroke();
    c.fillStyle="rgba(255,255,255,.28)"; c.beginPath(); c.ellipse(bx+(bx<210?-5:-1),319,5,2,0,0,7); c.fill();
  });
  c.save(); c.translate(0,bob*.6);
  /* blouse body (shows above bib + as sleeves) */
  c.fillStyle=GH.blouse; c.strokeStyle=GH.line; c.lineWidth=1.4;
  c.beginPath(); c.moveTo(175,155); c.quadraticCurveTo(210,141,245,155); c.lineTo(242,206); c.lineTo(178,206); c.closePath(); c.fill(); c.stroke();
  /* pinafore dress */
  const dg=c.createLinearGradient(170,175,250,265); dg.addColorStop(0,GH.dressHi); dg.addColorStop(.5,GH.dress); dg.addColorStop(1,GH.dressSh);
  c.fillStyle=dg; c.strokeStyle=GH.line; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(186,173); c.lineTo(234,173); c.lineTo(238,203); c.quadraticCurveTo(260,236,253,262); c.quadraticCurveTo(210,274,167,262); c.quadraticCurveTo(160,236,182,203); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle="rgba(30,90,85,.45)"; c.lineWidth=1.3;
  [[198,208,192,263],[210,208,210,268],[222,208,228,263]].forEach(([x1,y1,x2,y2])=>{ c.beginPath(); c.moveTo(x1,y1); c.quadraticCurveTo((x1+x2)/2+(x2>x1?3:-3),(y1+y2)/2,x2,y2); c.stroke(); });
  c.strokeStyle=GH.dressSh; c.lineWidth=1.4; c.fillStyle="rgba(255,255,255,.1)"; c.beginPath(); c.roundRect?c.roundRect(199,183,22,13,3):c.rect(199,183,22,13); c.fill(); c.stroke();
  /* straps + buttons */
  limb(c,191,174,193,151,6,GH.dress); limb(c,229,174,227,151,6,GH.dress);
  c.fillStyle="#f6c344"; c.strokeStyle=GH.line; c.lineWidth=.8;
  [[191,177],[229,177]].forEach(([x,y])=>{ c.beginPath(); c.arc(x,y,2.6,0,7); c.fill(); c.stroke(); });
  /* collar + red bow */
  c.fillStyle="#fffaf0"; c.strokeStyle=GH.line; c.lineWidth=1;
  c.beginPath(); c.ellipse(200,152,10,5.2,-.35,0,7); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(220,152,10,5.2,.35,0,7); c.fill(); c.stroke();
  c.fillStyle=GH.ribbon; c.strokeStyle="#8f2f2c"; c.lineWidth=1;
  c.beginPath(); c.moveTo(210,158); c.lineTo(198,153); c.lineTo(198,165); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(210,158); c.lineTo(222,153); c.lineTo(222,165); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(210,158,3.2,0,7); c.fill(); c.stroke();
  /* neck */
  c.fillStyle=GH.skin; c.fillRect(203.5,131,13,24);
  c.fillStyle="rgba(150,80,50,.28)"; c.beginPath(); c.ellipse(210,141,9,5,0,0,7); c.fill();
  c.restore();
  /* ---- braid over the shoulder (viewer-left) ---- */
  c.save(); c.translate(0,bob*.6);
  for(let i=0;i<8;i++){ const f=i/7, sway=Math.sin(T*1.4+i*.55)*2.4*f;
    const x=186-f*10+sway, y=146+i*10.2;
    c.fillStyle=GH.hair; c.strokeStyle="#150d0c"; c.lineWidth=1;
    c.beginPath(); c.ellipse(x+(i%2?1.3:-1.3),y,6.2-f*1.4,6.4,i%2?.35:-.35,0,7); c.fill(); c.stroke();
    c.strokeStyle="rgba(150,115,100,.5)"; c.lineWidth=1; c.beginPath(); c.moveTo(x-2,y-3); c.lineTo(x-1,y+3); c.stroke(); }
  { const sway=Math.sin(T*1.4+8*.55)*2.4; const bx=176+sway;
    c.fillStyle=GH.ribbon; c.strokeStyle="#8f2f2c"; c.lineWidth=1; c.beginPath(); c.ellipse(bx,228,5.4,3.4,0,0,7); c.fill(); c.stroke();
    c.fillStyle=GH.hair; c.beginPath(); c.moveTo(bx-3,230); c.quadraticCurveTo(bx-1,243,bx+1,241); c.quadraticCurveTo(bx+4,238,bx+3,230); c.fill(); }
  c.restore();
  /* ---- arms ---- */
  c.save(); c.translate(0,bob*.6);
  const [re,rw]=armPoints(240,163,p.ra[0],p.ra[1]);
  const [le,lw]=armPoints(180,163,p.la[0],p.la[1]);
  const arm=(sx0,sy0,el,wr,mirror)=>{
    limb(c,sx0,sy0,el[0],el[1],14,GH.blouse);
    c.fillStyle=GH.blouse; c.strokeStyle=GH.line; c.lineWidth=1.3; c.beginPath(); c.arc(sx0,sy0,8,0,7); c.fill(); c.stroke();
    limb(c,el[0],el[1],wr[0],wr[1],10.5,GH.skin);
    /* rolled cuff */
    const dx=wr[0]-el[0], dy=wr[1]-el[1], L=Math.hypot(dx,dy)||1;
    limb(c,el[0],el[1],el[0]+dx/L*5,el[1]+dy/L*5,14.5,GH.blouseSh);
    let rot=Math.atan2(dy,dx)+Math.PI/2; rot=Math.atan2(Math.sin(rot),Math.cos(rot))*.85;
    drawHumanHand(c,wr[0],wr[1],p.hand,rot,mirror);
  };
  arm(180,163,le,lw,true);
  arm(240,163,re,rw,false);
  c.restore();
  /* ---- head ---- */
  c.save(); c.translate(0,bob);
  c.translate(210,134); c.rotate((p.head||0)*.012); c.translate(-210,-134);
  /* back hair */
  c.fillStyle=GH.hair; c.strokeStyle="#150d0c"; c.lineWidth=1.2;
  c.beginPath(); c.ellipse(210,hy-2,31.5,32,0,0,7); c.fill(); c.stroke();
  /* face */
  const fg=c.createLinearGradient(190,hy-26,232,hy+30); fg.addColorStop(0,GH.skinHi); fg.addColorStop(.6,GH.skin); fg.addColorStop(1,GH.skinSh);
  c.fillStyle=fg; c.strokeStyle=GH.line; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(184.5,hy-3); c.bezierCurveTo(184,hy-29,236,hy-29,235.5,hy-3); c.bezierCurveTo(235.5,hy+15,225,hy+29,210,hy+29.5); c.bezierCurveTo(195,hy+29,184.5,hy+15,184.5,hy-3); c.closePath(); c.fill(); c.stroke();
  /* ears peeking */
  c.fillStyle=GH.skin; c.strokeStyle=GH.line; c.lineWidth=1; c.beginPath(); c.ellipse(184,hy+4,3.4,5,0,0,7); c.ellipse(236,hy+4,3.4,5,0,0,7); c.fill(); c.stroke();
  /* cheeks */
  [[193.5,hy+13],[226.5,hy+13]].forEach(([x,y])=>{ const g=c.createRadialGradient(x,y,0,x,y,8); g.addColorStop(0,"rgba(238,110,105,.5)"); g.addColorStop(1,"rgba(238,110,105,0)"); c.fillStyle=g; c.fillRect(x-9,y-9,18,18); });
  /* eyes */
  const bl=blink(T), gx=Math.sin(T*.6)*.7;
  [199,221].forEach((cx,k)=>{
    const cy=hy+3, ry=6.6*(1-bl*.93);
    c.save(); c.beginPath(); c.ellipse(cx,cy,5.7,ry,0,0,7); c.fillStyle="#fffaf2"; c.fill(); c.clip();
    const ig=c.createRadialGradient(cx+gx,cy-1,.5,cx+gx,cy,5.4); ig.addColorStop(0,"#7a4c34"); ig.addColorStop(.6,"#47291b"); ig.addColorStop(1,"#22120b");
    c.fillStyle=ig; c.beginPath(); c.ellipse(cx+gx,cy+.8,4.1,Math.min(ry,5.4),0,0,7); c.fill();
    c.fillStyle="#0e0705"; c.beginPath(); c.arc(cx+gx,cy+.8,2.2,0,7); c.fill();
    c.fillStyle="#fff"; c.beginPath(); c.arc(cx+gx-1.5,cy-1.8,1.6,0,7); c.fill();
    c.globalAlpha=.85; c.beginPath(); c.arc(cx+gx+1.7,cy+2.4,.8,0,7); c.fill(); c.globalAlpha=1;
    c.restore();
    /* upper lid + lash flick */
    c.strokeStyle="#22120c"; c.lineWidth=2.1; c.lineCap="round";
    const o=k===0?-1:1;
    c.beginPath(); c.moveTo(cx-6.1,cy+.4-bl*0); c.quadraticCurveTo(cx,cy-ry-1.2+bl*ry*1.7,cx+6.1,cy+.4); c.stroke();
    c.lineWidth=1.5; c.beginPath(); c.moveTo(cx+o*6,cy-.2); c.lineTo(cx+o*8.4,cy-2.2); c.stroke();
  });
  /* eyebrows = non-manual grammar channel (soft glow when raised / furrowed) */
  const up=p.brow==="up", dn=p.brow==="down";
  const by=hy-12-(up?5:0)+(dn?2.5:0);
  if(up||dn){ c.strokeStyle=up?"rgba(251,191,36,.45)":"rgba(248,113,113,.45)"; c.lineWidth=7; c.lineCap="round";
    c.beginPath(); c.moveTo(192,by+1); c.quadraticCurveTo(199,by-3,207,by+1); c.moveTo(213,by+1); c.quadraticCurveTo(221,by-3,228,by+1); c.stroke(); }
  c.strokeStyle=GH.hair; c.lineWidth=2.4; c.lineCap="round";
  c.beginPath();
  if(dn){ c.moveTo(192,by-1); c.quadraticCurveTo(199,by+1,207,by+4); c.moveTo(228,by-1); c.quadraticCurveTo(221,by+1,213,by+4); }
  else { c.moveTo(192,by+1.5); c.quadraticCurveTo(199,by-2.6,207,by+.6); c.moveTo(228,by+1.5); c.quadraticCurveTo(221,by-2.6,213,by+.6); }
  c.stroke();
  /* nose */
  c.strokeStyle=GH.skinSh; c.lineWidth=1.5; c.beginPath(); c.moveTo(209,hy+9); c.quadraticCurveTo(207.6,hy+12.5,210.6,hy+12.6); c.stroke();
  /* mouth morphemes */
  const my=hy+19; c.lineCap="round";
  if(p.mouth==="o"){ c.fillStyle="#8f3b33"; c.strokeStyle="#6e2a25"; c.lineWidth=1; c.beginPath(); c.ellipse(210,my,3.7,4.5,0,0,7); c.fill(); c.stroke();
    c.fillStyle="#d9776a"; c.beginPath(); c.ellipse(210,my+1.8,2.2,1.4,0,0,7); c.fill(); }
  else if(p.mouth==="smile"){ c.fillStyle="#9b3f36"; c.strokeStyle="#7a2e29"; c.lineWidth=1.4;
    c.beginPath(); c.moveTo(202.5,my-2); c.quadraticCurveTo(210,my+9,217.5,my-2); c.quadraticCurveTo(210,my+1.2,202.5,my-2); c.fill(); c.stroke();
    c.fillStyle="#fffaf2"; c.beginPath(); c.moveTo(205,my-.8); c.quadraticCurveTo(210,my+2.4,215,my-.8); c.quadraticCurveTo(210,my-.2,205,my-.8); c.fill(); }
  else if(p.mouth==="frown"){ c.strokeStyle="#9b4a3f"; c.lineWidth=2.2; c.beginPath(); c.moveTo(203.5,my+3); c.quadraticCurveTo(210,my-3.5,216.5,my+3); c.stroke(); }
  else { c.strokeStyle="#a4574a"; c.lineWidth=2.1; c.beginPath(); c.moveTo(205,my); c.quadraticCurveTo(210,my+2.3,215,my); c.stroke(); }
  /* hair front: side-swept fringe + side locks + highlight */
  c.fillStyle=GH.hair; c.strokeStyle="#150d0c"; c.lineWidth=1.2;
  c.beginPath(); c.moveTo(181.5,hy+2); c.bezierCurveTo(177,hy-38,243,hy-38,238.5,hy+2); c.bezierCurveTo(237,hy-10,230,hy-17,220,hy-16); c.bezierCurveTo(214,hy-9,201,hy-6,191,hy-9); c.bezierCurveTo(186,hy-6,183,hy-2,181.5,hy+2); c.closePath(); c.fill(); c.stroke();
  limb(c,184.5,hy-2,186.5,hy+17,5.2,GH.hair,"#150d0c"); limb(c,235.5,hy-2,233.5,hy+17,5.2,GH.hair,"#150d0c");
  c.strokeStyle=GH.hairHi; c.lineWidth=2.4; c.globalAlpha=.7; c.lineCap="round";
  c.beginPath(); c.moveTo(192,hy-25); c.quadraticCurveTo(205,hy-33,220,hy-27); c.stroke();
  c.lineWidth=1.4; c.beginPath(); c.moveTo(197,hy-20); c.quadraticCurveTo(207,hy-25,216,hy-21); c.stroke(); c.globalAlpha=1;
  /* little yellow flower hair-clip */
  const fx=229,fy=hy-17; c.strokeStyle="#b78a1c"; c.lineWidth=.8;
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; c.fillStyle="#ffd84a"; c.beginPath(); c.arc(fx+Math.cos(a)*3.2,fy+Math.sin(a)*3.2,2.3,0,7); c.fill(); c.stroke(); }
  c.fillStyle="#e8892b"; c.beginPath(); c.arc(fx,fy,1.8,0,7); c.fill();
  c.restore();
  c.restore();
}

/* ---- fingerspelling (close-up hand) in the same painted world ---- */
function drawFingerspellOn(c,W,H,letter,ph){
  const cfg=ABC[letter]||{f:[1,1,1,1],t:"in"};
  const cx=W/2, cy=H*0.56, L=72;
  c.clearRect(0,0,W,H);
  const bd=backdrop(W,H), T=performance.now()/1000;
  c.drawImage(bd.sky,0,0); drawClouds(c,W,H,T); c.drawImage(bd.hills,0,0);
  c.fillStyle="rgba(255,250,235,.55)"; c.fillRect(0,0,W,H);
  c.save(); c.translate(cx,cy);
  if(cfg.side) c.rotate(-Math.PI/2); if(cfg.down) c.rotate(Math.PI);
  const wig=cfg.sweep? Math.sin(ph*Math.PI)*40 : (cfg.zig? (ph<.33?-30:ph<.66?30:-10):0);
  c.rotate(wig*Math.PI/180); c.lineJoin="round"; c.lineCap="round";
  /* forearm + sleeve */
  c.fillStyle=GH.skin; c.strokeStyle=GH.line; c.lineWidth=2.4;
  c.beginPath(); c.moveTo(-24,88); c.lineTo(-28,42); c.quadraticCurveTo(0,27,28,42); c.lineTo(24,88); c.closePath(); c.fill(); c.stroke();
  c.fillStyle=GH.blouse; c.fillRect(-26,80,52,12); c.strokeRect(-26,80,52,12);
  /* fingers first (behind palm) */
  const xs=[-31,-10.5,10.5,31];
  for(let i=0;i<4;i++){
    const bend=Math.min(1,Math.max(-.3,cfg.f[i])), fx=xs[i], fy=-38;
    const tipY=fy-L*(1-bend*0.95), midY=fy-L*0.5*(1-bend*0.6);
    const off=(cfg.spread&&i<2)?(i===0?-9:9):(cfg.cross&&i<2)?(i===0?7:-7):0;
    c.strokeStyle=GH.line; c.lineWidth=16; c.beginPath(); c.moveTo(fx,fy); c.lineTo(fx+off*0.6,midY); c.lineTo(fx+off,tipY); c.stroke();
    c.strokeStyle=GH.skin; c.lineWidth=12.5; c.beginPath(); c.moveTo(fx,fy); c.lineTo(fx+off*0.6,midY); c.lineTo(fx+off,tipY); c.stroke();
    c.strokeStyle=GH.skinHi; c.lineWidth=3; c.beginPath(); c.moveTo(fx-2,fy); c.lineTo(fx-2+off*0.6,midY); c.lineTo(fx-2+off,tipY+2); c.stroke();
    c.fillStyle="#f8dcc0"; c.strokeStyle="rgba(120,70,50,.5)"; c.lineWidth=1; c.beginPath(); c.ellipse(fx+off,tipY+3,4.2,5.5,0,0,7); c.fill(); c.stroke();
  }
  let tx,ty;
  if(cfg.t==="up"){tx=-56;ty=-32;} else if(cfg.t==="out"){tx=-75;ty=0;} else if(cfg.t==="touch"){tx=-32;ty=-35;}
  else if(cfg.t==="front"){tx=-45;ty=34;} else {tx=-55;ty=30;}
  c.strokeStyle=GH.line; c.lineWidth=16; c.beginPath(); c.moveTo(-40,10); c.lineTo(tx,ty); c.stroke();
  c.strokeStyle=GH.skin; c.lineWidth=12.5; c.beginPath(); c.moveTo(-40,10); c.lineTo(tx,ty); c.stroke();
  c.fillStyle="#f8dcc0"; c.beginPath(); c.arc(tx,ty,4.4,0,7); c.fill();
  /* palm on top */
  const pg=c.createLinearGradient(-40,-40,40,60); pg.addColorStop(0,GH.skinHi); pg.addColorStop(1,GH.skin);
  c.fillStyle=pg; c.strokeStyle=GH.line; c.lineWidth=2.6;
  c.beginPath(); c.ellipse(0,8,44,52,0,0,7); c.fill(); c.stroke();
  c.restore();
  /* letter badge */
  c.fillStyle="rgba(63,154,143,.92)"; c.beginPath(); c.arc(cx,H-34,24,0,7); c.fill();
  c.strokeStyle="#fff"; c.lineWidth=2.5; c.stroke();
  c.fillStyle="#fff"; c.font="bold 30px 'Segoe UI',sans-serif"; c.textAlign="center"; c.textBaseline="middle"; c.fillText(letter.toUpperCase(),cx,H-33); c.textBaseline="alphabetic";
}

/* ---------- Reusable avatar player ---------- */
class AvatarPlayer{
  constructor(canvas,labelEl,statusEl){
    this.cv=canvas; this.ctx=canvas.getContext("2d");
    this.labelEl=labelEl||null; this.statusEl=statusEl||null;
    this.queue=[]; this.playing=false; this.cur=null; this.t0=0; this.idx=0;
    this.speed=1; this.loop=false; this.onDone=null; this.onStep=null; this.onEnd=null; this.gcount=0;
    this.idle=P([172,168],[188,192],{mouth:"smile"});   /* relaxed ready-pose: hands resting at chest height */
    AvatarPlayer.all.push(this);
  }
  clearCards(){}
  _build(glosses,q,neg){
    glosses.forEach(g=>{ const gi=this.gcount++;
      if(LIB[g]) this.queue.push({type:"sign",g,kf:LIB[g],gi});
      else g.split("").forEach(ch=>{ if(/[a-zA-Z]/.test(ch)) this.queue.push({type:"spell",ch,gi}); });
    });
    if(neg) this.queue.push({type:"sign",g:"NO",kf:LIB.NO,gi:-1});
    if(q) this.queue.push({type:"nmm",gi:-1});
  }
  playGlosses(glosses,q,neg){
    this.stop(false);
    this.queue=[]; this.gcount=0;
    this._build(glosses,q,neg);
    this.idx=0; this.playing=true; this.next();
  }
  /* add more signs without interrupting what is already being signed (continuous mode) */
  enqueueGlosses(glosses,q,neg){
    this._build(glosses,q,neg);
    if(!this.playing){ this.playing=true; this.next(); }
  }
  playWord(g){ this.playGlosses([g],false,false); }
  stop(redraw=true){
    this.queue=[]; this.playing=false; this.cur=null;
    if(this.onStep) this.onStep(null);
    if(this.labelEl) this.labelEl.textContent="—";
    if(redraw) drawPoseOn(this.ctx,this.cv.width,this.cv.height,this.idle);
  }
  next(){
    if(!this.queue.length){
      this.playing=false; this.cur=null;
      if(this.onStep) this.onStep(null);
      if(this.onEnd) this.onEnd();
      if(this.labelEl) this.labelEl.textContent="—";
      if(this.statusEl) this.statusEl.textContent="done";
      drawPoseOn(this.ctx,this.cv.width,this.cv.height,this.idle);
      if(this.loop){ const f=this.onDone; if(f) f(); }
      return;
    }
    this.playing=true; this.cur=this.queue.shift(); this.t0=performance.now();
    if(this.onStep) this.onStep(this.cur);
    if(this.labelEl) this.labelEl.textContent=this.cur.type==="spell"?"Fingerspell: "+this.cur.ch.toUpperCase():((typeof glossLabel==="function")?glossLabel(this.cur.g):this.cur.g)+(this.cur.type==="nmm"?" (non-manual)":"");
    if(this.statusEl) this.statusEl.textContent="signing…";
  }
  tick(){
    if(this.cv.offsetParent===null) return;   /* hidden screen: don't paint */
    if(!this.cur){ if(!this.playing) drawPoseOn(this.ctx,this.cv.width,this.cv.height,this.idle); return; }
    const el=(performance.now()-this.t0)*this.speed;
    if(this.cur.type==="sign"){
      const kf=this.cur.kf, total=kf.reduce((s,k)=>s+k.ms,0);
      if(el>=total){ this.next(); return; }
      let acc=0;
      for(let i=0;i<kf.length;i++){
        if(el<acc+kf[i].ms){ const t=(el-acc)/kf[i].ms, nxt=kf[(i+1)%kf.length];
          drawPoseOn(this.ctx,this.cv.width,this.cv.height,lerpPose(kf[i].pose,nxt.pose,t)); return; }
        acc+=kf[i].ms;
      }
    } else if(this.cur.type==="spell"){
      if(el>=650){ this.next(); return; }
      drawFingerspellOn(this.ctx,this.cv.width,this.cv.height,this.cur.ch,(el%650)/650);
    } else {
      const t=Math.min(1,el/900);
      drawPoseOn(this.ctx,this.cv.width,this.cv.height,P([0,90],[0,90],{brow:t>.2&&t<.8?"up":"flat",mouth:"o"}));
      if(el>=900) this.next();
    }
  }
}
AvatarPlayer.all=[];
(function loop(){ requestAnimationFrame(loop); AvatarPlayer.all.forEach(p=>p.tick()); })();
