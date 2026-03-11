import base64
import os
import sqlite3
import traceback
import json
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timedelta, date
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel

import firebase_admin
from firebase_admin import auth, credentials

# --- INITIALIZATION ---
load_dotenv()

# --- FIREBASE SETUP ---
def init_firebase():
    cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if cred_json:
        try:
            cred_json = cred_json.strip()
            if cred_json.startswith('"') and cred_json.endswith('"'):
                cred_json = cred_json[1:-1].strip()
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Firebase Init Error: {e}")
    else:
        cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)

init_firebase()

# --- CONFIGURATION & DATABASE ---
DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = os.path.join(os.path.dirname(__file__), "lumi.db")
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
PROMPT_DIR = os.path.join(os.path.dirname(__file__), "prompts")

@contextmanager
def get_db():
    """Database session manager providing thread-safe SQLite or Postgres connections."""
    is_postgres = DATABASE_URL and (DATABASE_URL.startswith("postgres") or DATABASE_URL.startswith("postgresql"))
    if is_postgres:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn_str = DATABASE_URL
        if "sslmode" not in DATABASE_URL:
            conn_str += ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"
        conn = psycopg2.connect(conn_str, cursor_factory=RealDictCursor)
        conn.autocommit = True
    else:
        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
    
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initializes the database schema if it doesn't exist."""
    with get_db() as conn:
        schema_pg = """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, 
                email TEXT,
                wizard_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS profiles (
                id SERIAL PRIMARY KEY,
                user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                name TEXT, avatar TEXT, grade INTEGER, federal_state TEXT,
                learning_type TEXT, learning_goal TEXT, meta_prompt TEXT,
                streak INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                selected_subjects TEXT
            );
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                subject TEXT, topic TEXT, goal_type TEXT, goal_deadline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                role TEXT, content TEXT, image_base64 TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS blast_results (
                id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                score INTEGER NOT NULL,
                total_questions INTEGER DEFAULT 10,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
        schema_sqlite = schema_pg.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        try:
            if DATABASE_URL:
                conn.cursor().execute(schema_pg)
            else:
                conn.executescript(schema_sqlite)
        except Exception as e:
            print(f"Init DB error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="LUMI API", lifespan=lifespan)

# --- MIDDLEWARE ---
origins = [
    "http://localhost:5173", 
    "http://localhost:4173", 
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://lumi-ki.onrender.com", 
    "https://uni-lumi-ki-lernplattform.onrender.com"
]
if os.getenv("CORS_ORIGINS"):
    extra_origins = [o.strip().rstrip('/') for o in os.getenv("CORS_ORIGINS").split(",")]
    origins.extend(extra_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"GLOBAL ERROR: {exc}")
    traceback.print_exc()
    return HTTPException(status_code=500, detail=str(exc))

# --- AUTHENTICATION ---
async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        with get_db() as conn:
            cur = conn.cursor()
            if DATABASE_URL:
                cur.execute("SELECT id FROM users WHERE id = %s", (uid,))
                if not cur.fetchone():
                    cur.execute("INSERT INTO users (id, email) VALUES (%s, %s)", (uid, decoded_token.get('email')))
            else:
                if not conn.execute("SELECT id FROM users WHERE id = ?", (uid,)).fetchone():
                    conn.execute("INSERT INTO users (id, email) VALUES (?, ?)", (uid, decoded_token.get('email')))
                    conn.commit()
        return uid
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# --- MODELS ---
class WizardRequest(BaseModel):
    name: str; avatar: str; grade: int; federal_state: str;
    learning_type: str; learning_goal: str; selected_subjects: List[str] = []

class ProfileSubjectsRequest(BaseModel):
    selected_subjects: List[str]

class CourseRequest(BaseModel):
    subject: str; topic: str; goal_type: str = ""; goal_deadline: str = ""

class ChatRequest(BaseModel):
    course_id: int; message: str; image_base64: Optional[str] = None

class BlastResultRequest(BaseModel):
    score: int
    total_questions: int

SUBJECT_META = {
    "mathe": {"label": "Mathe", "emoji": "🔢", "color": "blue"},
    "deutsch": {"label": "Deutsch", "emoji": "📖", "color": "green"},
    "englisch": {"label": "Englisch", "emoji": "🇬🇧", "color": "red"},
    "sachunterricht": {"label": "Sachunterricht", "emoji": "🌍", "color": "amber"},
    "kunst": {"label": "Kunst", "emoji": "🎨", "color": "purple"},
    "musik": {"label": "Musik", "emoji": "🎵", "color": "pink"},
    "sport": {"label": "Sport", "emoji": "⚽", "color": "teal"},
    "religion_ethik": {"label": "Religion/Ethik", "emoji": "🕊️", "color": "indigo"},
}

# --- ROUTES ---

@app.get("/")
async def root(): return {"message": "LUMI API Ready"}

@app.get("/api/profile")
async def get_profile(uid: str = Depends(get_current_user)):
    with get_db() as conn:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT name, avatar, grade, federal_state, learning_type, learning_goal, selected_subjects FROM profiles WHERE user_id = %s", (uid,))
            p = cur.fetchone()
            cur.execute("SELECT wizard_completed FROM users WHERE id = %s", (uid,))
            u = cur.fetchone()
        else:
            p = conn.execute("SELECT name, avatar, grade, federal_state, learning_type, learning_goal, selected_subjects FROM profiles WHERE user_id = ?", (uid,)).fetchone()
            u = conn.execute("SELECT wizard_completed FROM users WHERE id = ?", (uid,)).fetchone()
        if not p: return {"wizard_completed": bool(u["wizard_completed"]) if u else False}
        res = dict(p)
        res["selected_subjects"] = [s for s in (res.get("selected_subjects") or "").split(",") if s]
        res["wizard_completed"] = bool(u["wizard_completed"]) if u else False
        return res

@app.post("/api/profile/wizard")
async def wizard(body: WizardRequest, uid: str = Depends(get_current_user)):
    meta = f"Name: {body.name}, Klasse: {body.grade}. Sprache: freundlich."
    sel = ",".join(body.selected_subjects)
    with get_db() as conn:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("SELECT id FROM profiles WHERE user_id = %s", (uid,))
            if cur.fetchone():
                cur.execute("UPDATE profiles SET name=%s, avatar=%s, grade=%s, federal_state=%s, learning_type=%s, learning_goal=%s, meta_prompt=%s, selected_subjects=%s WHERE user_id=%s", (body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, sel, uid))
            else:
                cur.execute("INSERT INTO profiles (user_id, name, avatar, grade, federal_state, learning_type, learning_goal, meta_prompt, selected_subjects) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", (uid, body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, sel))
            cur.execute("UPDATE users SET wizard_completed = TRUE WHERE id = %s", (uid,))
        else:
            if conn.execute("SELECT id FROM profiles WHERE user_id = ?", (uid,)).fetchone():
                conn.execute("UPDATE profiles SET name=?, avatar=?, grade=?, federal_state=?, learning_type=?, learning_goal=?, meta_prompt=?, selected_subjects=? WHERE user_id=?", (body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, sel, uid))
            else:
                conn.execute("INSERT INTO profiles (user_id, name, avatar, grade, federal_state, learning_type, learning_goal, meta_prompt, selected_subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (uid, body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, sel))
            conn.execute("UPDATE users SET wizard_completed = TRUE WHERE id = ?", (uid,))
            conn.commit()
    return {"ok": True}

@app.put("/api/profile/subjects")
async def update_subjects(body: ProfileSubjectsRequest, uid: str = Depends(get_current_user)):
    sel = ",".join(body.selected_subjects)
    with get_db() as conn:
        if DATABASE_URL: conn.cursor().execute("UPDATE profiles SET selected_subjects = %s WHERE user_id = %s", (sel, uid))
        else: conn.execute("UPDATE profiles SET selected_subjects = ? WHERE user_id = ?", (sel, uid)); conn.commit()
    return {"ok": True}

@app.post("/api/blast/results")
async def save_blast_result(body: BlastResultRequest, uid: str = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        if DATABASE_URL: cur.execute("INSERT INTO blast_results (user_id, score, total_questions) VALUES (%s, %s, %s)", (uid, body.score, body.total_questions))
        else: conn.execute("INSERT INTO blast_results (user_id, score, total_questions) VALUES (?, ?, ?)", (uid, body.score, body.total_questions)); conn.commit()
    return {"ok": True}

@app.get("/api/subjects/all")
async def get_all_subjects(uid: str = Depends(get_current_user)):
    return [{"id": sid, **m} for sid, m in SUBJECT_META.items()]

@app.get("/api/subjects")
async def get_subjects(uid: str = Depends(get_current_user)):
    p = await get_profile(uid)
    sel = p.get("selected_subjects", [])
    return [{"id": sid, **m} for sid, m in SUBJECT_META.items() if not sel or sid in sel]

@app.get("/api/greeting")
async def greeting(uid: str = Depends(get_current_user)):
    p = await get_profile(uid)
    if "name" not in p: return {"name": "Lerner", "avatar": "fox", "streak": 0, "greeting_message": "Hallo!"}
    return {"name": p["name"], "avatar": p["avatar"], "streak": p.get("streak", 0), "greeting_message": "Schön dich zu sehen!"}

@app.post("/api/courses")
async def create_course(body: CourseRequest, uid: str = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (%s, %s, %s, %s, %s) RETURNING id", (uid, body.subject, body.topic, body.goal_type, body.goal_deadline))
            cid = cur.fetchone()['id']
        else:
            cursor = conn.execute("INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (?, ?, ?, ?, ?)", (uid, body.subject, body.topic, body.goal_type, body.goal_deadline))
            conn.commit(); cid = cursor.lastrowid
    return {"id": cid}

@app.get("/api/courses")
async def list_courses(uid: str = Depends(get_current_user)):
    with get_db() as conn:
        if DATABASE_URL:
            cur = conn.cursor(); cur.execute("SELECT id, subject, topic FROM courses WHERE user_id = %s ORDER BY created_at DESC", (uid,)); rows = cur.fetchall()
        else:
            rows = conn.execute("SELECT id, subject, topic FROM courses WHERE user_id = ? ORDER BY created_at DESC", (uid,)).fetchall()
        return [dict(r) for r in rows]

@app.get("/api/courses/{course_id}/messages")
async def list_messages(course_id: int, uid: str = Depends(get_current_user)):
    with get_db() as conn:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT role, content, image_base64 FROM messages WHERE course_id = %s AND user_id = %s ORDER BY created_at ASC", (course_id, uid))
            rows = cur.fetchall()
        else:
            rows = conn.execute("SELECT role, content, image_base64 FROM messages WHERE course_id = ? AND user_id = ? ORDER BY created_at ASC", (course_id, uid)).fetchall()
        return [dict(r) for r in rows]

@app.post("/api/chat")
async def chat(body: ChatRequest, uid: str = Depends(get_current_user)):
    try:
        with get_db() as conn:
            cur = conn.cursor()
            if DATABASE_URL:
                cur.execute("SELECT * FROM courses WHERE id = %s AND user_id = %s", (body.course_id, uid)); course = cur.fetchone()
                cur.execute("SELECT * FROM profiles WHERE user_id = %s", (uid,)); profile = cur.fetchone()
            else:
                course = conn.execute("SELECT * FROM courses WHERE id = ? AND user_id = ?", (body.course_id, uid)).fetchone()
                profile = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (uid,)).fetchone()
            
            if not course: raise HTTPException(404, detail="Course not found")
            if not profile: raise HTTPException(404, detail="Profile not found")

            k_path = os.path.join(KNOWLEDGE_DIR, course["subject"], f"klasse_{profile['grade']}.md")
            knowledge = ""
            if os.path.exists(k_path):
                with open(k_path, "r", encoding="utf-8") as f: knowledge = f.read()

            prompt_path = os.path.join(PROMPT_DIR, "system_prompt.txt")
            if not os.path.exists(prompt_path): raise HTTPException(500, detail="System prompt missing")
            with open(prompt_path, "r", encoding="utf-8") as f: template = f.read()
            
            sys_p = template.format(lehrplan_kontext=knowledge, meta_prompt=profile["meta_prompt"], fach=course["subject"], thema=course["topic"], lernziel=course["topic"])

            user_parts = [genai.types.Part(text=body.message)]
            if body.image_base64:
                img_raw = body.image_base64.split(",")[1] if "," in body.image_base64 else body.image_base64
                user_parts.append(genai.types.Part.from_bytes(data=base64.b64decode(img_raw), mime_type="image/jpeg"))
            
            # --- GEMINI CALL WITH ROBUST FALLBACK ---
            ai_res = ""
            errors = []
            models_to_try = [
                "models/gemini-2.5-flash",
                "models/gemini-2.0-flash",
                "models/gemini-1.5-flash",
                "models/gemini-1.5-flash-8b"
            ]
            
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

            for model_name in models_to_try:
                try:
                    res = client.models.generate_content(
                        model=model_name, 
                        contents=[genai.types.Content(role="user", parts=user_parts)], 
                        config=genai.types.GenerateContentConfig(system_instruction=sys_p)
                    )
                    ai_res = res.text or ""
                    if ai_res: break
                except Exception as gemini_err:
                    errors.append(f"{model_name}: {str(gemini_err)[:50]}")
                    continue
            
            if not ai_res:
                combined_errors = "\n".join(errors)
                if "429" in combined_errors or "RESOURCE_EXHAUSTED" in combined_errors:
                    ai_res = "⚠️ **LUMI macht gerade eine Pause.**\n\nMein KI-Limit für heute ist leider erreicht. Bitte versuche es in ein paar Minuten (oder mit einem neuen API-Key) wieder! 😊"
                else:
                    ai_res = f"❌ **KI-Fehler:** Ich konnte keine Verbindung zu Google herstellen.\n\nDetails:\n```\n{combined_errors[:150]}...\n```"

            # Save to database
            if DATABASE_URL:
                cur.execute("INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (%s, %s, 'user', %s, %s)", (body.course_id, uid, body.message, body.image_base64))
                cur.execute("INSERT INTO messages (course_id, user_id, role, content) VALUES (%s, %s, 'assistant', %s)", (body.course_id, uid, ai_res))
            else:
                conn.execute("INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (?, ?, 'user', ?, ?)", (body.course_id, uid, body.message, body.image_base64))
                conn.execute("INSERT INTO messages (course_id, user_id, role, content) VALUES (?, ?, 'assistant', ?)", (body.course_id, uid, ai_res))
                conn.commit()
            
            return {"response": ai_res}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
