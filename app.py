import json, os, re, secrets, sqlite3, time
from concurrent.futures import ThreadPoolExecutor
from functools import wraps
from flask import (Flask, render_template, request, redirect, url_for,
                   session, jsonify, g, flash, abort)
from werkzeug.security import generate_password_hash, check_password_hash
from deep_translator import GoogleTranslator
import requests

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "islbridge.db")
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me-before-deploy")
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=True)
ADMIN_KEY = os.environ.get("ADMIN_KEY", "change-this-admin-key")
ORG_TYPES = ["Hospital", "Bank", "Railway station", "School", "Government office", "Other"]


def load(name):
    with open(os.path.join(BASE, "data", name), encoding="utf8") as f:
        return json.load(f)


LANGS = load("langs.json")            # code -> {n: native name, sr: speech locale}
UI_EN = load("ui_en.json")            # English interface strings (translated on demand, never hand-translated)
EXTRAS, QUIZZES, PHRASES = load("extras.json"), load("quizzes.json"), load("phrases.json")

# ---- trained model + pose library (optional until the notebook has been run) ----
PRED_ERR = ""
try:
    from model.predictor import Predictor
    PRED = Predictor(os.path.join(BASE, "model"))
except Exception as e:
    import traceback; traceback.print_exc()
    print("MODEL NOT LOADED:", type(e).__name__, e)
    PRED, PRED_ERR = None, f"{type(e).__name__}: {e}"
POSES = {}
_pl = os.path.join(BASE, "model", "pose_library.json")
if os.path.exists(_pl):
    with open(_pl, encoding="utf8") as f:
        POSES = {k.lower(): v for k, v in json.load(f).items()}

# ---- database ----
SCHEMA = """
create table if not exists accounts(
  id integer primary key, role text, name text, email text unique, pw text,
  org_type text, reg_no text, status text, created text default current_timestamp);
create table if not exists scores(
  id integer primary key, uid integer, quiz text, score int, total int, ts text default current_timestamp);
create table if not exists progress(uid integer primary key, done text default '[]', quiz_best int default 0);
create table if not exists tcache(src text, source text, lang text, out text, primary key(src, source, lang));
create table if not exists feedback(
  id integer primary key, uid integer, label text, seq text, ts text default current_timestamp);
"""


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    d = g.pop("db", None)
    if d:
        d.close()


with sqlite3.connect(DB) as _c:
    _c.executescript(SCHEMA)


# ---- CSRF ----
def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


app.jinja_env.globals["csrf_token"] = csrf_token


@app.before_request
def csrf_check():
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        sent = (request.form.get("csrf_token") or request.headers.get("X-CSRF-Token", "")).encode()
        good = session.get("csrf", "").encode()
        if not good or not secrets.compare_digest(sent, good):
            abort(400, "Security token missing or expired. Reload the page and try again.")


def need(role):
    def deco(fn):
        @wraps(fn)
        def inner(*a, **k):
            if session.get("role") != role:
                if request.path.startswith("/api/"):
                    abort(401)
                return redirect(url_for("login", role=role))
            return fn(*a, **k)
        return inner
    return deco


# ---- translation through deep-translator, cached in the database ----
_hits = {}


def limited():
    ip, now = request.remote_addr, time.time()
    _hits[ip] = [t for t in _hits.get(ip, []) if now - t < 60] + [now]
    return len(_hits[ip]) > 120


def _gtx(text, source, target):
    """Google's JSON translate endpoint (the one Chrome's translate button uses). More reliable than
    scraping the web page, and `requests` brings its own certificates (no macOS certificate problems)."""
    r = requests.get("https://translate.googleapis.com/translate_a/single",
                     params={"client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text},
                     headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
    r.raise_for_status()
    out = "".join(seg[0] for seg in r.json()[0] if seg and seg[0])
    if not out:
        raise ValueError("empty answer")
    return out


def _translate_text(text, source, target):
    errs = []
    for name, fn in (("google-json", lambda: _gtx(text, source, target)),
                     ("deep-translator", lambda: GoogleTranslator(source=source, target=target).translate(text))):
        try:
            out = fn()
            if out:
                return out
            errs.append(f"{name}: empty answer")
        except Exception as e:
            errs.append(f"{name}: {type(e).__name__}: {e}")
    raise RuntimeError(" | ".join(errs))


def _one(args):
    text, source, target = args
    for attempt in range(2):
        try:
            return _translate_text(text, source, target) or text
        except Exception as e:
            print("translate failed:", type(e).__name__, e)
    return None


def _chunks(items, max_chars=1800, max_items=25):
    cur, size = [], 0
    for t in items:
        n = len(t) + 1
        if cur and (size + n > max_chars or len(cur) >= max_items):
            yield cur
            cur, size = [], 0
        cur.append(t)
        size += n
    if cur:
        yield cur


def _chunk_translate(args):
    """One Google request for a whole group of strings (one per line). If the line count comes back
    different, fall back to one request per string (slower, but never mixes strings up)."""
    items, source, target = args
    flat = [" ".join(t.split()) for t in items]
    try:
        out = _translate_text("\n".join(flat), source, target)
        lines = (out or "").split("\n")
        if len(lines) == len(items):
            return [ln.strip() or None for ln in lines]
        print(f"translate: batch of {len(items)} came back as {len(lines)} lines, retrying one by one")
    except Exception as e:
        # the service itself is refusing or unreachable: do not hammer it string by string, fail fast
        print("translate failed (batch):", type(e).__name__, e)
        return [None] * len(items)
    res = []
    for t in items:
        res.append(_one((t, source, target)))
        time.sleep(0.05)
    return res


def tr(texts, target, source="en"):
    if target == source:
        return texts
    out, todo = {}, []
    for t in dict.fromkeys(texts):
        r = db().execute("select out from tcache where src=? and source=? and lang=?", (t, source, target)).fetchone()
        if r:
            out[t] = r["out"]
        elif t.strip():
            todo.append(t)
    if todo:
        chunks = list(_chunks(todo))
        with ThreadPoolExecutor(3) as ex:
            res = list(ex.map(_chunk_translate, [(c, source, target) for c in chunks]))
        for c, rs in zip(chunks, res):
            for t, o in zip(c, rs):
                if o:
                    out[t] = o
                    db().execute("insert or replace into tcache values(?,?,?,?)", (t, source, target, o))
        db().commit()
    return [out.get(t, t) for t in texts]


@app.get("/api/translate_status")
def api_translate_status():
    """Open this in the browser: shows whether each translation method works from THIS computer."""
    res = {}
    for name, fn in (("google-json", lambda: _gtx("Hello", "en", "hi")),
                     ("deep-translator", lambda: GoogleTranslator(source="en", target="hi").translate("Hello"))):
        try:
            res[name] = {"ok": True, "sample": fn()}
        except Exception as e:
            res[name] = {"ok": False, "error": f"{type(e).__name__}: {e}"[:300]}
    return jsonify(ok=any(v["ok"] for v in res.values()), methods=res)


@app.post("/api/translate")
def api_translate():
    if limited():
        abort(429)
    d = request.get_json(silent=True) or {}
    lang, source = d.get("lang", "en"), d.get("source", "en")
    if lang not in LANGS or (source != "auto" and source not in LANGS):
        abort(400)
    texts = [str(t)[:400] for t in d.get("texts", [])[:300]]
    return jsonify(texts=tr(texts, lang, source))


# ---- pages ----
@app.context_processor
def inject():
    return dict(me=session.get("name"), role=session.get("role"))


@app.route("/")
def index():
    return render_template("index.html", ui_en=UI_EN, langs=LANGS)


def safe_next(url):
    return url if url and url.startswith("/") and not url.startswith("//") else None


@app.route("/register/<role>", methods=["GET", "POST"])
def register(role):
    if role not in ("user", "org"):
        abort(404)
    if request.method == "POST":
        f = request.form
        email = f.get("email", "").strip().lower()
        if len(f.get("password", "")) < 8:
            flash("Password needs at least 8 characters.")
        else:
            try:
                db().execute(
                    "insert into accounts(role,name,email,pw,org_type,reg_no,status) values(?,?,?,?,?,?,?)",
                    (role, f["name"].strip(), email, generate_password_hash(f["password"]),
                     f.get("org_type"), f.get("reg_no", "").strip(), "active" if role == "user" else "pending"))
                db().commit()
                flash("Account created." if role == "user"
                      else "Request received. You can log in once we verify your organisation.")
                return redirect(url_for("login", role=role))
            except sqlite3.IntegrityError:
                flash("That email is already registered.")
    return render_template("auth.html", mode="register", target=role, org_types=ORG_TYPES, ui_en=UI_EN, langs=LANGS)


@app.route("/login/<role>", methods=["GET", "POST"])
def login(role):
    if role not in ("user", "org"):
        abort(404)
    if request.method == "POST":
        a = db().execute("select * from accounts where email=? and role=?",
                         (request.form.get("email", "").strip().lower(), role)).fetchone()
        if not a or not check_password_hash(a["pw"], request.form.get("password", "")):
            flash("Email or password is wrong.")
        elif role == "org" and a["status"] != "approved":
            flash("Your organisation is still waiting for verification.")
        else:
            session.clear()
            session.update(uid=a["id"], role=role, name=a["name"], org_type=a["org_type"])
            return redirect(safe_next(request.args.get("next")) or ("/" if role == "user" else url_for("desk")))
    return render_template("auth.html", mode="login", target=role, ui_en=UI_EN, langs=LANGS)


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/desk")
@need("org")
def desk():
    kind = {"Hospital": "hospital", "Bank": "bank", "Railway station": "railway",
            "School": "school"}.get(session.get("org_type"), "general")
    return render_template("desk.html", staff=PHRASES["staff"].get(kind, []) + PHRASES["staff"]["common"],
                           signer=PHRASES["signer"], model_ready=bool(PRED and PRED.ready), poses=len(POSES),
                           ui_en=UI_EN, langs=LANGS)


@app.route("/admin", methods=["GET", "POST"])
def admin():
    if request.method == "POST" and request.form.get("key") == ADMIN_KEY:
        session["admin"] = True
    if not session.get("admin"):
        return render_template("admin.html", rows=None, ui_en=UI_EN, langs=LANGS)
    if request.form.get("approve"):
        db().execute("update accounts set status='approved' where id=? and role='org'", (request.form["approve"],))
        db().commit()
    rows = db().execute("select * from accounts where role='org' order by status, created desc").fetchall()
    return render_template("admin.html", rows=rows, ui_en=UI_EN, langs=LANGS)


# ---- learner APIs: progress, extra material, knowledge quizzes ----
@app.get("/api/progress")
@need("user")
def progress_get():
    r = db().execute("select done, quiz_best from progress where uid=?", (session["uid"],)).fetchone()
    return jsonify(done=json.loads(r["done"]) if r else [], quizBest=r["quiz_best"] if r else 0)


@app.post("/api/progress")
@need("user")
def progress_set():
    d = request.get_json(silent=True) or {}
    cur = db().execute("select done, quiz_best from progress where uid=?", (session["uid"],)).fetchone()
    done = sorted(set(json.loads(cur["done"]) if cur else []) | {str(x)[:20] for x in d.get("done", [])[:50]})
    best = max(int(cur["quiz_best"]) if cur else 0, min(int(d.get("quizBest", 0) or 0), 5))
    db().execute("insert or replace into progress values(?,?,?)", (session["uid"], json.dumps(done), best))
    db().commit()
    return jsonify(done=done, quizBest=best)


@app.get("/api/extras")
@need("user")
def extras():
    return jsonify(EXTRAS)


@app.get("/api/knowledge")
@need("user")
def knowledge_list():
    rows = db().execute("select quiz, max(score) best, total from scores where uid=? group by quiz",
                        (session["uid"],)).fetchall()
    best = {r["quiz"]: [r["best"], r["total"]] for r in rows}
    return jsonify([{"id": q["id"], "title": q["title"], "count": len(q["items"]), "best": best.get(q["id"])}
                    for q in QUIZZES])


def find_quiz(qid):
    q = next((x for x in QUIZZES if x["id"] == qid), None)
    if not q:
        abort(404)
    return q


@app.get("/api/knowledge/<qid>")
@need("user")
def knowledge_get(qid):
    q = find_quiz(qid)
    return jsonify(title=q["title"], questions=[{"q": i["q"], "options": i["options"]} for i in q["items"]])


@app.post("/api/knowledge/<qid>")
@need("user")
def knowledge_submit(qid):
    q = find_quiz(qid)
    ans = (request.get_json(silent=True) or {}).get("answers", [])
    if len(ans) != len(q["items"]):
        abort(400)
    key = [i["answer"] for i in q["items"]]
    score = sum(1 for a, k in zip(ans, key) if a == k)
    db().execute("insert into scores(uid,quiz,score,total) values(?,?,?,?)", (session["uid"], qid, score, len(key)))
    db().commit()
    return jsonify(score=score, total=len(key), key=key)


# ---- organisation APIs: recognition, text to pose, feedback ----
@app.post("/api/predict")
@need("org")
def api_predict():
    if not (PRED and PRED.ready):
        return jsonify(error="Model files not found in model/. Train it with the notebook first."), 503
    try:
        return jsonify(top=PRED.predict(request.get_json(force=True)["seq"]))
    except (ValueError, KeyError):
        abort(400)


_phits = {}


@app.post("/api/predict_public")
def api_predict_public():
    """Same model as /api/predict, but open to the public Sign to Voice page (no login).
    Only 21 hand points per frame arrive here, never video. Limited to 150 requests per minute per IP."""
    ip, now = request.remote_addr, time.time()
    _phits[ip] = [t for t in _phits.get(ip, []) if now - t < 60] + [now]
    if len(_phits[ip]) > 150:
        abort(429)
    if not (PRED and PRED.ready):
        return jsonify(error=PRED_ERR or "Model files not found in model/."), 503
    try:
        d = request.get_json(force=True)
        seqs = (d.get("seqs") or [d["seq"]])[:3]
        return jsonify(top=PRED.predict_multi(seqs))
    except (ValueError, KeyError):
        abort(400)
    except Exception as e:                       # show the real reason instead of failing silently
        import traceback; traceback.print_exc()
        return jsonify(error=f"{type(e).__name__}: {e}"), 500


@app.get("/api/model_status")
def api_model_status():
    ok = bool(PRED and PRED.ready)
    labels = getattr(PRED, "labels", []) if ok else []
    return jsonify(ready=ok, labels=len(labels), words=sum(len(x) > 1 for x in labels),
                   poses=len(POSES), error=PRED_ERR)


@app.post("/api/signs_public")
def api_signs_public():
    """Voice to Sign (public): return the recorded signs from model/pose_library.json for a sentence
    (longest match first, so "thank you" beats "thank").
    spell=false: only if EVERY word has a recording, otherwise an empty list.
    spell=true : a word without a recording is fingerspelled with the recorded letters/digits."""
    ip, now = request.remote_addr, time.time()
    _phits[ip] = [t for t in _phits.get(ip, []) if now - t < 60] + [now]
    if len(_phits[ip]) > 150:
        abort(429)
    d = request.get_json(silent=True) or {}
    spell = bool(d.get("spell"))
    toks = re.findall(r"[a-z0-9]+", str(d.get("text", ""))[:300].lower())

    def seg(label):
        v = POSES[label]
        return {"label": label, "frames": v["f"] if isinstance(v, dict) else v,
                "wrists": v.get("w") if isinstance(v, dict) else None}

    segs, i = [], 0
    while i < len(toks):
        for n in (3, 2, 1):
            cand = " ".join(toks[i:i + n])
            if len(toks[i:i + n]) == n and cand in POSES and (len(cand) > 1 or cand.isdigit()):
                segs.append(seg(cand)); i += n
                break
        else:
            if not spell:
                return jsonify(segments=[])
            segs += [seg(c) for c in toks[i] if c in POSES]
            i += 1
    return jsonify(segments=segs)


@app.post("/api/text2pose")
@need("org")
def api_text2pose():
    d = request.get_json(silent=True) or {}
    en = str(d.get("text", ""))[:300]

    def seg(label):
        v = POSES[label]
        if isinstance(v, dict):
            return {"label": label, "frames": v["f"], "wrists": v.get("w")}
        return {"label": label, "frames": v, "wrists": None}

    segs = []
    for w in re.findall(r"[a-z0-9]+", en.lower()):
        if w in POSES:
            segs.append(seg(w))
        else:  # fall back to fingerspelling
            segs += [seg(c) for c in w if c in POSES]
    return jsonify(segments=segs)


@app.post("/api/feedback")
@need("org")
def api_feedback():
    d = request.get_json(silent=True) or {}
    if not d.get("label") or len(d.get("seq", [])) < 4:
        abort(400)
    db().execute("insert into feedback(uid,label,seq) values(?,?,?)",
                 (session["uid"], str(d["label"])[:40], json.dumps(d["seq"])))
    db().commit()
    return jsonify(ok=True)


if __name__ == "__main__":
    app.run(debug=os.environ.get("DEBUG") == "1")
