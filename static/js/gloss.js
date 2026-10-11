/* Shared with the service desk: English text -> ISL glosses (taken from app.js, unchanged). */
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
function lexicon(){ return {...BASE_LEX}; }
function wordToGloss(w){
  const lex=lexicon();
  for(const g in lex) if(lex[g].w===w) return g;
  const map={hello:"HELLO",hi:"HELLO",eat:"EAT",drink:"DRINK",study:"LEARN",okay:"FINE",ok:"FINE",morning:"MORNING",teacher:"TEACHER",water:"WATER",food:"FOOD",home:"HOME",name:"NAME",help:"HELP",good:"GOOD",thank:"THANK",thanks:"THANK",want:"WANT",go:"GO",like:"LIKE",see:"SEE",milk:"MILK",tea:"TEA",school:"SCHOOL",book:"BOOK",train:"TRAIN",bus:"BUS",hospital:"HOSPITAL",sorry:"SORRY",please:"PLEASE",come:"COME",give:"GIVE",yes:"YES",no:"NO",what:"WHAT",where:"WHERE",who:"WHO",friend:"FRIEND",my:"ME",i:"ME",am:"",is:"",are:""};
  return map[w]||null;
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
