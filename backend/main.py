import base64
import os
import sqlite3
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date

import hashlib
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel

import firebase_admin
from firebase_admin import auth, credentials

load_dotenv()

# --- FIREBASE ADMIN SETUP ---
cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
if cred_json:
    import json
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
else:
    cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
    else:
        print("WARNING: No Firebase credentials found. Auth will fail.")

# --- CONFIGURATION ---
DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = os.path.join(os.path.dirname(__file__), "lumi.db")
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
PROMPT_DIR = os.path.join(os.path.dirname(__file__), "prompts")

def get_db():
    if DATABASE_URL and DATABASE_URL.startswith("postgres"):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn_str = DATABASE_URL
        if "sslmode" not in DATABASE_URL:
            conn_str += ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"
        conn = psycopg2.connect(conn_str, cursor_factory=RealDictCursor)
        conn.autocommit = True
        return conn
    else:
        # SQLite with timeout to prevent 'database is locked'
        conn = sqlite3.connect(DB_PATH, timeout=20)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    # Attempt to detect old schema
    if not DATABASE_URL and os.path.exists(DB_PATH):
        try:
            conn = get_db()
            res = conn.execute("PRAGMA table_info(users)").fetchall()
            for col in res:
                if col[1] == 'id' and col[2] == 'INTEGER':
                    print("!!! OLD SCHEMA DETECTED !!!")
                    print("Please delete 'backend/lumi.db' to migrate to Firebase IDs.")
            conn.close()
        except: pass

    conn = get_db()
    schema = """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, 
            email TEXT,
            wizard_completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            user_id TEXT UNIQUE REFERENCES users(id),
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            grade INTEGER NOT NULL,
            federal_state TEXT DEFAULT '',
            learning_type TEXT NOT NULL,
            learning_goal TEXT NOT NULL,
            meta_prompt TEXT NOT NULL,
            streak INTEGER DEFAULT 0,
            last_active_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            selected_subjects TEXT
        );
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            subject TEXT NOT NULL,
            topic TEXT NOT NULL,
            goal_type TEXT,
            goal_deadline TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            course_id INTEGER REFERENCES courses(id),
            user_id TEXT REFERENCES users(id),
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """
    try:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute(schema.replace("AUTOINCREMENT", "").replace("INTEGER PRIMARY KEY", "SERIAL PRIMARY KEY"))
        else:
            conn.executescript(schema.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT"))
        conn.commit()
    except Exception as e:
        print(f"Init DB error: {e}")
    finally:
        conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="LUMI API", lifespan=lifespan)

origins = ["http://localhost:5173", "http://localhost:4173"]
if os.getenv("CORS_ORIGINS"):
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

# --- AUTH HELPER ---

def get_current_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht eingeloggt")
    
    id_token = authorization.split(" ", 1)[1]
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        conn = get_db()
        try:
            if DATABASE_URL:
                cur = conn.cursor()
                cur.execute("SELECT id FROM users WHERE id = %s", (uid,))
                if not cur.fetchone():
                    cur.execute("INSERT INTO users (id, email) VALUES (%s, %s)", (uid, decoded_token.get('email')))
            else:
                if not conn.execute("SELECT id FROM users WHERE id = ?", (uid,)).fetchone():
                    conn.execute("INSERT INTO users (id, email) VALUES (?, ?)", (uid, decoded_token.get('email')))
                    conn.commit()
        finally:
            conn.close()
        return uid
    except Exception as e:
        print(f"DEBUG AUTH ERROR: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Auth-Fehler: {str(e)}")

# --- SUBJECT DATA ---
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

# --- MODELS ---
class WizardRequest(BaseModel):
    name: str
    avatar: str
    grade: int
    federal_state: str
    learning_type: str
    learning_goal: str
    selected_subjects: list[str] = []

class CourseRequest(BaseModel):
    subject: str
    topic: str
    goal_type: str = ""
    goal_deadline: str = ""

class ChatRequest(BaseModel):
    course_id: int
    message: str
    image_base64: str | None = None

# --- ROUTES ---

@app.get("/")
def root(): return {"message": "LUMI API"}

@app.get("/api/profile")
def get_profile(user_id: str = Depends(get_current_user_id)):
    conn = get_db()
    try:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT name, avatar, grade, federal_state, learning_type, learning_goal, selected_subjects FROM profiles WHERE user_id = %s", (user_id,))
            profile = cur.fetchone()
            cur.execute("SELECT wizard_completed FROM users WHERE id = %s", (user_id,))
            u = cur.fetchone()
        else:
            profile = conn.execute("SELECT name, avatar, grade, federal_state, learning_type, learning_goal, selected_subjects FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
            u = conn.execute("SELECT wizard_completed FROM users WHERE id = ?", (user_id,)).fetchone()
        
        if not profile:
            return {"wizard_completed": bool(u["wizard_completed"]) if u else False}
        
        d = dict(profile)
        d["selected_subjects"] = [s for s in (d.get("selected_subjects") or "").split(",") if s]
        d["wizard_completed"] = bool(u["wizard_completed"]) if u else False
        return d
    finally:
        conn.close()

@app.post("/api/profile/wizard")
def wizard(body: WizardRequest, user_id: str = Depends(get_current_user_id)):
    meta = f"Name: {body.name}, Klasse: {body.grade}. Sprache: freundlich."
    selected = ",".join(body.selected_subjects)
    conn = get_db()
    try:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT id FROM profiles WHERE user_id = %s", (user_id,))
            if cur.fetchone():
                cur.execute("UPDATE profiles SET name=%s, avatar=%s, grade=%s, federal_state=%s, learning_type=%s, learning_goal=%s, meta_prompt=%s, selected_subjects=%s WHERE user_id=%s", (body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, selected, user_id))
            else:
                cur.execute("INSERT INTO profiles (user_id, name, avatar, grade, federal_state, learning_type, learning_goal, meta_prompt, selected_subjects) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", (user_id, body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, selected))
            cur.execute("UPDATE users SET wizard_completed = TRUE WHERE id = %s", (user_id,))
        else:
            if conn.execute("SELECT id FROM profiles WHERE user_id = ?", (user_id,)).fetchone():
                conn.execute("UPDATE profiles SET name=?, avatar=?, grade=?, federal_state=?, learning_type=?, learning_goal=?, meta_prompt=?, selected_subjects=? WHERE user_id=?", (body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, selected, user_id))
            else:
                conn.execute("INSERT INTO profiles (user_id, name, avatar, grade, federal_state, learning_type, learning_goal, meta_prompt, selected_subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (user_id, body.name, body.avatar, body.grade, body.federal_state, body.learning_type, body.learning_goal, meta, selected))
            conn.execute("UPDATE users SET wizard_completed = TRUE WHERE id = ?", (user_id,))
            conn.commit()
        return {"ok": True}
    finally:
        conn.close()

@app.get("/api/subjects/all")
def get_all_subjects(grade: int | None = None, user_id: str = Depends(get_current_user_id)):
    available = []
    for sid, m in SUBJECT_META.items():
        available.append({"id": sid, **m})
    return available

@app.get("/api/subjects")
def get_subjects(user_id: str = Depends(get_current_user_id)):
    profile = get_profile(user_id)
    selected = profile.get("selected_subjects", [])
    
    available = []
    for sid, m in SUBJECT_META.items():
        if selected and sid not in selected: continue
        available.append({"id": sid, **m})
    return available

@app.get("/api/greeting")
def greeting(user_id: str = Depends(get_current_user_id)):
    p = get_profile(user_id)
    if not p or "name" not in p: return {"name": "Lerner", "avatar": "fox", "streak": 0, "greeting_message": "Hallo!"}
    return {"name": p["name"], "avatar": p["avatar"], "streak": p.get("streak", 0), "greeting_message": "Schön dich zu sehen!"}

@app.post("/api/courses")
def create_course(body: CourseRequest, user_id: str = Depends(get_current_user_id)):
    conn = get_db()
    try:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (%s, %s, %s, %s, %s) RETURNING id", (user_id, body.subject, body.topic, body.goal_type, body.goal_deadline))
            cid = cur.fetchone()['id']
        else:
            cursor = conn.execute("INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (?, ?, ?, ?, ?)", (user_id, body.subject, body.topic, body.goal_type, body.goal_deadline))
            conn.commit()
            cid = cursor.lastrowid
        return {"id": cid}
    finally:
        conn.close()

@app.get("/api/courses")
def list_courses(user_id: str = Depends(get_current_user_id)):
    conn = get_db()
    try:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT id, subject, topic FROM courses WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
            rows = cur.fetchall()
        else:
            rows = conn.execute("SELECT id, subject, topic FROM courses WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@app.post("/api/chat")
def chat(body: ChatRequest, user_id: str = Depends(get_current_user_id)):
    conn = get_db()
    try:
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT * FROM courses WHERE id = %s AND user_id = %s", (body.course_id, user_id)); course = cur.fetchone()
            cur.execute("SELECT * FROM profiles WHERE user_id = %s", (user_id,)); profile = cur.fetchone()
        else:
            course = conn.execute("SELECT * FROM courses WHERE id = ? AND user_id = ?", (body.course_id, user_id)).fetchone()
            profile = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
        
        if not course or not profile: raise HTTPException(404)
        
        if DATABASE_URL:
            cur.execute("SELECT role, content FROM messages WHERE course_id = %s ORDER BY created_at ASC LIMIT 20", (body.course_id,)); history = cur.fetchall()
        else:
            history = conn.execute("SELECT role, content FROM messages WHERE course_id = ? ORDER BY created_at ASC LIMIT 20", (body.course_id,)).fetchall()

        knowledge = ""
        k_path = os.path.join(KNOWLEDGE_DIR, course["subject"], f"klasse_{profile['grade']}.md")
        if os.path.exists(k_path):
            with open(k_path, "r") as f: knowledge = f.read()
        
        template = ""
        with open(os.path.join(PROMPT_DIR, "system_prompt.txt"), "r") as f: template = f.read()
        sys_prompt = template.format(lehrplan_kontext=knowledge, meta_prompt=profile["meta_prompt"], fach=course["subject"], thema=course["topic"], lernziel=course["topic"])
        
        contents = [genai.types.Content(role="user" if m["role"]=="user" else "model", parts=[genai.types.Part(text=m["content"])]) for m in history]
        user_parts = [genai.types.Part(text=body.message)]
        if body.image_base64:
            img_data = body.image_base64.split(",")[1] if "," in body.image_base64 else body.image_base64
            user_parts.append(genai.types.Part.from_bytes(data=base64.b64decode(img_data), mime_type="image/jpeg"))
        contents.append(genai.types.Content(role="user", parts=user_parts))
        
        res = gemini_client.models.generate_content(model="gemini-3-flash-preview", contents=contents, config=genai.types.GenerateContentConfig(system_instruction=sys_prompt))
        ai_res = res.text or ""

        if DATABASE_URL:
            cur.execute("INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (%s, %s, 'user', %s, %s)", (body.course_id, user_id, body.message, body.image_base64))
            cur.execute("INSERT INTO messages (course_id, user_id, role, content) VALUES (%s, %s, 'assistant', %s)", (body.course_id, user_id, ai_res))
        else:
            conn.execute("INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (?, ?, 'user', ?, ?)", (body.course_id, user_id, body.message, body.image_base64))
            conn.execute("INSERT INTO messages (course_id, user_id, role, content) VALUES (?, ?, 'assistant', ?)", (body.course_id, user_id, ai_res))
            conn.commit()
        return {"response": ai_res}
    finally:
        conn.close()
