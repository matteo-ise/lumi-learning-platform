import base64
import os
import sqlite3
import traceback
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date

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
    try:
        cred_json = cred_json.strip()
        if cred_json.startswith('"') and cred_json.endswith('"'):
            cred_json = cred_json[1:-1].strip()
        cred_dict = json.loads(cred_json)
        cred = credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"FATAL FIREBASE ERROR: {e}")
else:
    cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)

# --- CONFIGURATION ---
DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = os.path.join(os.path.dirname(__file__), "lumi.db")
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
PROMPT_DIR = os.path.join(os.path.dirname(__file__), "prompts")

def get_db_conn():
    if DATABASE_URL and (DATABASE_URL.startswith("postgres") or DATABASE_URL.startswith("postgresql")):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn_str = DATABASE_URL
        if "sslmode" not in DATABASE_URL:
            conn_str += ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"
        conn = psycopg2.connect(conn_str, cursor_factory=RealDictCursor)
        conn.autocommit = True
        return conn
    else:
        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        schema = """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, email TEXT,
                wizard_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS profiles (
                id SERIAL PRIMARY KEY, user_id TEXT UNIQUE REFERENCES users(id),
                name TEXT, avatar TEXT, grade INTEGER, federal_state TEXT,
                learning_type TEXT, learning_goal TEXT, meta_prompt TEXT,
                streak INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                selected_subjects TEXT
            );
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY, user_id TEXT REFERENCES users(id),
                subject TEXT, topic TEXT, goal_type TEXT, goal_deadline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY, course_id INTEGER REFERENCES courses(id),
                user_id TEXT REFERENCES users(id), role TEXT, content TEXT,
                image_base64 TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
        if DATABASE_URL:
            cur.execute(schema)
        else:
            conn.executescript(schema.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT"))
    except: pass
    finally: conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="LUMI API", lifespan=lifespan)

origins = ["http://localhost:5173", "http://localhost:4173", "https://lumi-ki.onrender.com"]
if os.getenv("CORS_ORIGINS"): 
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

def get_current_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Nicht eingeloggt")
    try:
        decoded = auth.verify_id_token(authorization.split(" ")[1])
        uid = decoded['uid']
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            if DATABASE_URL:
                cur.execute("SELECT id FROM users WHERE id = %s", (uid,))
                if not cur.fetchone():
                    cur.execute("INSERT INTO users (id, email) VALUES (%s, %s)", (uid, decoded.get('email')))
            else:
                if not conn.execute("SELECT id FROM users WHERE id = ?", (uid,)).fetchone():
                    conn.execute("INSERT INTO users (id, email) VALUES (?, ?)", (uid, decoded.get('email')))
                    conn.commit()
        finally: conn.close()
        return uid
    except Exception as e:
        raise HTTPException(401, f"Token ungültig: {str(e)}")

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

class WizardRequest(BaseModel):
    name: str; avatar: str; grade: int; federal_state: str;
    learning_type: str; learning_goal: str; selected_subjects: list[str] = []

class ProfileSubjectsRequest(BaseModel):
    selected_subjects: list[str] = []

class CourseRequest(BaseModel):
    subject: str; topic: str; goal_type: str = ""; goal_deadline: str = ""

class ChatRequest(BaseModel):
    course_id: int; message: str; image_base64: str | None = None

@app.get("/")
def root(): return {"message": "LUMI API"}

@app.get("/api/profile")
def get_profile(uid: str = Depends(get_current_user_id)):
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
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
    finally: conn.close()

@app.post("/api/profile/wizard")
def wizard(body: WizardRequest, uid: str = Depends(get_current_user_id)):
    meta = f"Name: {body.name}, Klasse: {body.grade}. Sprache: freundlich."
    sel = ",".join(body.selected_subjects)
    conn = get_db_conn()
    try:
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
    finally: conn.close()

@app.put("/api/profile/subjects")
def update_subjects(body: ProfileSubjectsRequest, uid: str = Depends(get_current_user_id)):
    sel = ",".join(body.selected_subjects)
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("UPDATE profiles SET selected_subjects = %s WHERE user_id = %s", (sel, uid))
        else:
            conn.execute("UPDATE profiles SET selected_subjects = ? WHERE user_id = ?", (sel, uid))
            conn.commit()
        return {"ok": True}
    finally: conn.close()

@app.get("/api/subjects/all")
def get_all_subjects(grade: int | None = None, uid: str = Depends(get_current_user_id)):
    return [{"id": sid, **m} for sid, m in SUBJECT_META.items()]

@app.get("/api/subjects")
def get_subjects(uid: str = Depends(get_current_user_id)):
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("SELECT selected_subjects FROM profiles WHERE user_id = %s", (uid,)); p = cur.fetchone()
        else:
            p = conn.execute("SELECT selected_subjects FROM profiles WHERE user_id = ?", (uid,)).fetchone()
        sel = [s for s in (p["selected_subjects"] if p else "").split(",") if s]
        return [{"id": sid, **m} for sid, m in SUBJECT_META.items() if not sel or sid in sel]
    finally: conn.close()

@app.get("/api/greeting")
def greeting(uid: str = Depends(get_current_user_id)):
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("SELECT name, avatar, streak FROM profiles WHERE user_id = %s", (uid,)); p = cur.fetchone()
        else:
            p = conn.execute("SELECT name, avatar, streak FROM profiles WHERE user_id = ?", (uid,)).fetchone()
        if not p: return {"name": "Lerner", "avatar": "fox", "streak": 0, "greeting_message": "Hallo!"}
        return {"name": p["name"], "avatar": p["avatar"], "streak": p["streak"] or 0, "greeting_message": "Schön dich zu sehen!"}
    finally: conn.close()

@app.post("/api/courses")
def create_course(body: CourseRequest, uid: str = Depends(get_current_user_id)):
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (%s, %s, %s, %s, %s) RETURNING id", (uid, body.subject, body.topic, body.goal_type, body.goal_deadline))
            cid = cur.fetchone()['id']
        else:
            cursor = conn.execute("INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (?, ?, ?, ?, ?)", (uid, body.subject, body.topic, body.goal_type, body.goal_deadline))
            conn.commit(); cid = cursor.lastrowid
        return {"id": cid}
    finally: conn.close()

@app.get("/api/courses")
def list_courses(uid: str = Depends(get_current_user_id)):
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("SELECT id, subject, topic FROM courses WHERE user_id = %s ORDER BY created_at DESC", (uid,)); rows = cur.fetchall()
        else:
            rows = conn.execute("SELECT id, subject, topic FROM courses WHERE user_id = ? ORDER BY created_at DESC", (uid,)).fetchall()
        return [dict(r) for r in rows]
    finally: conn.close()

@app.post("/api/chat")
def chat(body: ChatRequest, uid: str = Depends(get_current_user_id)):
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        if DATABASE_URL:
            cur.execute("SELECT * FROM courses WHERE id = %s AND user_id = %s", (body.course_id, uid)); course = cur.fetchone()
            cur.execute("SELECT * FROM profiles WHERE user_id = %s", (uid,)); profile = cur.fetchone()
        else:
            course = conn.execute("SELECT * FROM courses WHERE id = ? AND user_id = ?", (body.course_id, uid)).fetchone()
            profile = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (uid,)).fetchone()
        if not course or not profile: raise HTTPException(404)
        k_path = os.path.join(KNOWLEDGE_DIR, course["subject"], f"klasse_{profile['grade']}.md")
        knowledge = open(k_path, "r").read() if os.path.exists(k_path) else ""
        sys_p = open(os.path.join(PROMPT_DIR, "system_prompt.txt"), "r").read().format(lehrplan_kontext=knowledge, meta_prompt=profile["meta_prompt"], fach=course["subject"], thema=course["topic"], lernziel=course["topic"])
        user_parts = [genai.types.Part(text=body.message)]
        if body.image_base64:
            img_d = body.image_base64.split(",")[1] if "," in body.image_base64 else body.image_base64
            user_parts.append(genai.types.Part.from_bytes(data=base64.b64decode(img_d), mime_type="image/jpeg"))
        res = gemini_client.models.generate_content(model="gemini-3-flash-preview", contents=[genai.types.Content(role="user", parts=user_parts)], config=genai.types.GenerateContentConfig(system_instruction=sys_p))
        ai_res = res.text or ""
        if DATABASE_URL:
            cur.execute("INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (%s, %s, 'user', %s, %s)", (body.course_id, uid, body.message, body.image_base64))
            cur.execute("INSERT INTO messages (course_id, user_id, role, content) VALUES (%s, %s, 'assistant', %s)", (body.course_id, uid, ai_res))
        else:
            conn.execute("INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (?, ?, 'user', ?, ?)", (body.course_id, uid, body.message, body.image_base64))
            conn.execute("INSERT INTO messages (course_id, user_id, role, content) VALUES (?, ?, 'assistant', ?)", (body.course_id, uid, ai_res))
            conn.commit()
        return {"response": ai_res}
    finally: conn.close()
