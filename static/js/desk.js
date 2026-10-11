import {HandLandmarker, FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const $ = id => document.getElementById(id);
const token = () => document.querySelector('meta[name="csrf-token"]').content;
const post = (u, b) => fetch(u, {method: "POST", headers: {"Content-Type": "application/json", "X-CSRF-Token": token()}, body: JSON.stringify(b)});
const log = $("log"), draft = $("draft");

/* the avatar class is chosen by avatar3d.js (3D body, or Hana 2D if WebGL is not available) */
window.glossLabel = g => (I18N.lang !== "en" && I18N.wordOf(g)) || g;
const avatar = new (window.AvatarClass || AvatarPlayer)($("avatar"), $("nowSign"), $("avStatus"));
avatar.loop = false;

/* ---------- conversation ---------- */
function addMsg(who, text, meta) {
  const b = document.createElement("div"); b.className = "bubble " + who;
  b.textContent = text;
  if (meta) { const m = document.createElement("span"); m.className = "meta"; m.textContent = meta; b.append(m); }
  log.append(b); log.scrollTop = log.scrollHeight;
}
function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = I18N.tts();
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* staff -> customer: any language -> English (library) -> glosses -> avatar */
async function playEnglish(eng) {
  if ($("useData") && $("useData").checked && avatar.playSegments) {
    const r = await (await post("/api/text2pose", {text: eng})).json();
    if (r.segments.length) { avatar.playSegments(r.segments); return; }
  }
  const r = englishToGlosses(eng);
  avatar.playGlosses(r.glosses.length ? r.glosses : ["SORRY"], r.q, r.neg);
}
async function staffSays(text, en) {
  addMsg("me", text);
  playEnglish(en || await I18N.toEnglish(text));
}
$("send").onclick = () => { const t = $("txt").value.trim(); if (t) { staffSays(t); $("txt").value = ""; } };
$("txt").addEventListener("keydown", e => e.key === "Enter" && $("send").click());
document.querySelectorAll("#staffChips .seqcard").forEach(c => c.onclick = () => staffSays(c.textContent, c.dataset.en));
document.querySelectorAll("#signerChips .seqcard").forEach(c => c.onclick = () => { addMsg("them", c.textContent, "quick reply"); speak(c.textContent); });

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let micOn = false, rec = null;
$("mic").onclick = () => {
  if (micOn) { micOn = false; try { rec.stop(); } catch (e) {} return; }
  if (!SR) { $("avStatus").textContent = "Speech input needs Chrome or Edge."; return; }
  micOn = true; $("mic").classList.add("green");
  const start = () => {
    rec = new SR(); rec.lang = I18N.sr(); rec.continuous = true;
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) staffSays(e.results[i][0].transcript.trim()); };
    rec.onend = () => { if (micOn) { try { start(); } catch (e) { micOn = false; } } else $("mic").classList.remove("green"); };
    try { rec.start(); } catch (e) {}
  };
  start();
};

/* ---------- customer: camera -> hand points -> LSTM+Transformer model on the server ---------- */
const THRESH = 0.6, END_GAP = 10;
let lm, buf = [], gap = 0, lastSeq = null, words = [];
function feat(hands) {          // same layout as the training notebook
  const out = new Array(126).fill(0);
  hands.map(h => ({h, x: h[0].x})).sort((a, b) => a.x - b.x).slice(0, 2).forEach((o, i) => {
    const w = o.h[0], v = [];
    o.h.forEach(p => v.push(p.x - w.x, p.y - w.y, p.z - w.z));
    const m = Math.max(1e-6, ...v.map(Math.abs));
    v.forEach((a, j) => (out[i * 63 + j] = a / m));
  });
  return out;
}
function showDraft() {
  draft.innerHTML = "";
  words.forEach(w => { const s = document.createElement("span"); s.className = "seqcard"; s.textContent = w; draft.append(s); });
}
async function recognise(seq) {
  const r = await post("/api/predict", {seq});
  if (!r.ok) { $("camst").textContent = r.status === 503 ? (await r.json()).error : "Model unavailable"; return; }
  const tops = (await r.json()).top;   // words are favoured over letters/digits
  const top = tops.find(t => t.conf >= (t.label.length > 1 ? 0.35 : 0.6));
  if (top) { words.push(top.label); lastSeq = seq; showDraft(); $("camst").textContent = ""; }
  else $("camst").textContent = I18N.t("d_unsure");
}
$("camBtn").onclick = async () => {
  $("camst").textContent = "…";
  try {
    const fs = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    lm = await HandLandmarker.createFromOptions(fs, {
      baseOptions: {modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"},
      runningMode: "VIDEO", numHands: 2});
    const cam = $("vid");
    cam.srcObject = await navigator.mediaDevices.getUserMedia({video: {width: 640, height: 480}});
    await cam.play();
    $("camst").textContent = I18N.t("d_ready");
    loop();
  } catch (e) { $("camst").textContent = String(e.message || e); }
};
const sk = $("skel"), sctx = sk.getContext("2d"); sk.width = 480; sk.height = 360;
function loop() {
  const cam = $("vid");
  if (cam.readyState >= 2) {
    const res = lm.detectForVideo(cam, performance.now());
    sctx.clearRect(0, 0, 480, 360);
    if (res.landmarks.length) {
      gap = 0; buf.push(feat(res.landmarks)); if (buf.length > 90) buf.shift();
      sctx.fillStyle = "#34d399";
      res.landmarks.flat().forEach(p => sctx.fillRect(p.x * 480 - 2, p.y * 360 - 2, 4, 4));
    } else if (buf.length && ++gap > END_GAP) {
      if (buf.length >= 12) recognise(buf);
      buf = []; gap = 0;
    }
  }
  requestAnimationFrame(loop);
}
$("clr").onclick = () => { words = []; showDraft(); };
$("sayDraft").onclick = async () => {
  if (!words.length) return;
  const en = words.join(" "); words = []; showDraft();
  const shown = await I18N.fromEnglish(en);           // translated into the staff language by the backend
  addMsg("them", shown, en); speak(shown);
};
$("fix").onclick = async () => {
  if (!lastSeq) return;
  const label = prompt("Correct word?");
  if (!label) return;
  words[words.length - 1] = label.toLowerCase(); showDraft();
  await post("/api/feedback", {seq: lastSeq, label: label.toLowerCase()});   // only hand points + label are stored
};
