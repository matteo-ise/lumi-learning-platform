import base64
import os
import sqlite3
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date

import hashlib
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel

load_dotenv()

# --- CONFIGURATION ---
# In Production, set these in your Hosting Dashboard (Azure/Render/Railway)
DATABASE_URL = os.getenv("DATABASE_URL") # e.g., postgresql://user:pass@host:port/db
DB_PATH = os.path.join(os.path.dirname(__file__), "lumi.db")
# Secure JWT Secret: Use a long random string in production!
JWT_SECRET = os.getenv("JWT_SECRET", "lumi-super-safe-dev-secret-99123-change-me")
JWT_ALGORITHM = "HS256"

def get_db():
    """Returns a database connection. Supports SQLite and PostgreSQL via DATABASE_URL."""
    if DATABASE_URL and DATABASE_URL.startswith("postgres"):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        # Handle Render/Heroku SSL requirement
        if "sslmode" not in DATABASE_URL:
            # Add sslmode=require if not present
            conn_str = DATABASE_URL + ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"
        else:
            conn_str = DATABASE_URL
        conn = psycopg2.connect(conn_str, cursor_factory=RealDictCursor)
        conn.autocommit = True
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


def init_db():
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        # Postgres syntax for table creation
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                wizard_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id),
                name TEXT NOT NULL,
                avatar TEXT NOT NULL,
                grade INTEGER NOT NULL,
                federal_state TEXT DEFAULT '',
                learning_type TEXT NOT NULL,
                learning_goal TEXT NOT NULL,
                meta_prompt TEXT NOT NULL,
                streak INTEGER DEFAULT 0,
                last_active_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                goal_type TEXT,
                goal_deadline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id),
                user_id INTEGER REFERENCES users(id),
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                image_base64 TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS blast_results (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                score INTEGER NOT NULL,
                total_questions INTEGER DEFAULT 10,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
    else:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                wizard_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE REFERENCES users(id),
                name TEXT NOT NULL,
                avatar TEXT NOT NULL,
                grade INTEGER NOT NULL,
                federal_state TEXT DEFAULT '',
                learning_type TEXT NOT NULL,
                learning_goal TEXT NOT NULL,
                meta_prompt TEXT NOT NULL,
                streak INTEGER DEFAULT 0,
                last_active_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                goal_type TEXT,
                goal_deadline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER REFERENCES courses(id),
                user_id INTEGER REFERENCES users(id),
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                image_base64 TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS blast_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                score INTEGER NOT NULL,
                total_questions INTEGER DEFAULT 10,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Demo account only for local SQLite
        existing = conn.execute("SELECT id FROM users WHERE email = ?", ("lena@demo.de",)).fetchone()
        if not existing:
            pw_hash = hashlib.sha256("1234".encode()).hexdigest()
            conn.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", ("lena@demo.de", pw_hash))
            conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="LUMI API", version="0.1.0", lifespan=lifespan)

# --- CORS ---
origins = [
    "http://localhost:5173",
    "http://localhost:4173",
]
prod_origin = os.getenv("CORS_ORIGINS")
if prod_origin:
    origins.extend(prod_origin.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))


# ── Auth helpers ──

def create_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user_id(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht eingeloggt")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungueltiger Token")


# ── Models ──

class AuthRequest(BaseModel):
    email: str
    password: str


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


class HotkeyRequest(BaseModel):
    course_id: int
    hotkey_type: str  # NEXT_STEP, SIMPLIFY, EXAMPLE


class ProfileSubjectsRequest(BaseModel):
    selected_subjects: list[str] = []


# ── Routes ──

@app.get("/")
def root():
    return {"message": "LUMI API"}


@app.get("/api/test-gemini")
async def test_gemini():
    response = gemini_client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="Sag kurz Hallo und stell dich als LUMI vor – ein freundlicher Lerntutor.",
    )
    return {"response": response.text}


@app.post("/api/auth/register")
def register(body: AuthRequest):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        existing = cur.fetchone()
        if existing:
            conn.close()
            raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
        pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
        cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id", (body.email, pw_hash))
        user_id = cur.fetchone()['id']
    else:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
        if existing:
            conn.close()
            raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
        pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
        cursor = conn.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (body.email, pw_hash))
        conn.commit()
        user_id = cursor.lastrowid
    conn.close()
    return {"token": create_token(user_id), "user_id": user_id, "wizard_completed": False}


@app.post("/api/auth/login")
def login(body: AuthRequest):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (body.email,))
        user = cur.fetchone()
    else:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()
    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    if not user or pw_hash != user["password_hash"]:
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch")
    return {
        "token": create_token(user["id"]),
        "user_id": user["id"],
        "wizard_completed": bool(user["wizard_completed"]),
    }


LEARNING_TYPE_LABELS = {
    'kurz': 'kurz & knapp → komm direkt auf den Punkt, keine langen Texte',
    'ausfuehrlich': 'ausführlich → erkläre alles genau mit Zusammenhängen',
    'beispiele': 'mit vielen Beispielen → zeige immer ein konkretes Beispiel',
}

LEARNING_GOAL_LABELS = {
    'noten': 'bessere Noten',
    'pruefung': 'Prüfung bestehen',
    'neugier': 'aus Neugier lernen',
}


@app.post("/api/profile/wizard")
def wizard(body: WizardRequest, user_id: int = Depends(get_current_user_id)):
    lt = LEARNING_TYPE_LABELS.get(body.learning_type, body.learning_type)
    lg = LEARNING_GOAL_LABELS.get(body.learning_goal, body.learning_goal)
    meta_prompt = (
        f"Der Schüler heißt {body.name}, Klasse {body.grade}, Bundesland {body.federal_state}. "
        f"Lerntyp: {lt}. "
        f"Lernziel: {lg}. "
        f"Sprache: freundlich, ermutigend, altersgerecht."
    )
    selected = ",".join(body.selected_subjects) if body.selected_subjects else ""
    conn = get_db()
    
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT id FROM profiles WHERE user_id = %s", (user_id,))
        existing = cur.fetchone()
        if existing:
            cur.execute(
                """UPDATE profiles SET name=%s, avatar=%s, grade=%s, federal_state=%s,
                   learning_type=%s, learning_goal=%s, meta_prompt=%s, selected_subjects=%s WHERE user_id=%s""",
                (body.name, body.avatar, body.grade, body.federal_state,
                 body.learning_type, body.learning_goal, meta_prompt, selected, user_id),
            )
        else:
            cur.execute(
                """INSERT INTO profiles (user_id, name, avatar, grade, federal_state,
                   learning_type, learning_goal, meta_prompt, selected_subjects)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user_id, body.name, body.avatar, body.grade, body.federal_state,
                 body.learning_type, body.learning_goal, meta_prompt, selected),
            )
        cur.execute("UPDATE users SET wizard_completed = TRUE WHERE id = %s", (user_id,))
    else:
        existing = conn.execute("SELECT id FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
        if existing:
            conn.execute(
                """UPDATE profiles SET name=?, avatar=?, grade=?, federal_state=?,
                   learning_type=?, learning_goal=?, meta_prompt=?, selected_subjects=? WHERE user_id=?""",
                (body.name, body.avatar, body.grade, body.federal_state,
                 body.learning_type, body.learning_goal, meta_prompt, selected, user_id),
            )
        else:
            conn.execute(
                """INSERT INTO profiles (user_id, name, avatar, grade, federal_state,
                   learning_type, learning_goal, meta_prompt, selected_subjects)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, body.name, body.avatar, body.grade, body.federal_state,
                 body.learning_type, body.learning_goal, meta_prompt, selected),
            )
        conn.execute("UPDATE users SET wizard_completed = TRUE WHERE id = ?", (user_id,))
        conn.commit()
    conn.close()
    return {"ok": True}


GREETINGS = [
    "Mathe ist wie Kochen – man braucht die richtigen Zutaten! 🧑‍🍳",
    "Wer lernt, hat morgen weniger Panik! 😄",
    "Dein Gehirn ist ein Muskel – trainier es! 💪",
    "Fehler sind die besten Lehrer! 🎓",
    "Heute ist ein guter Tag zum Lernen! ☀️",
    "Jeder Profi war mal ein Anfaenger! 🌱",
    "Lernen ist wie ein Abenteuer – pack es an! 🗺️",
    "Du schaffst das – ich glaub an dich! ⭐",
    "Wissen ist wie ein Schatz – je mehr, desto reicher! 💎",
    "Kleine Schritte fuehren zu grossen Zielen! 🏔️",
    "Neugier ist deine Superkraft! 🦸",
    "Uebung macht den Meister – und den Spass! 🎉",
    "Dein Wissen waechst mit jeder Frage! 🌳",
    "Heute Lerner, morgen Held! 🦸‍♀️",
    "Lernen ist cooler als du denkst! 😎",
    "Zusammen lernen wir schneller! 🤝",
    "Jede Minute zaehlt – du bist toll! 🌟",
    "Stell dir vor, was du alles weisst! 🧠",
    "Bildung ist die beste Investition! 📈",
    "Lernen oeffnet Tueren – alle Tueren! 🚪",
    "Du bist schlauer als du denkst! 🤓",
    "Ein Schritt nach dem anderen! 👣",
    "Wer fragt, gewinnt! ❓",
    "Lernen macht gluecklich – echt jetzt! 😊",
    "Dein Fortschritt ist beeindruckend! 📊",
    "Bleib dran – es lohnt sich! 🏆",
    "Mathe kann auch Spass machen! 🔢",
    "Englisch lernen? Easy peasy! 🇬🇧",
    "Deutsch ist doch gar nicht so schwer! 📖",
    "Du rockst das! 🎸",
]


@app.get("/api/profile")
def get_profile(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT name, avatar, grade, federal_state, learning_type, learning_goal, selected_subjects FROM profiles WHERE user_id = %s", (user_id,))
        profile = cur.fetchone()
    else:
        profile = conn.execute("SELECT name, avatar, grade, federal_state, learning_type, learning_goal, selected_subjects FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    if not profile:
        return None
    d = dict(profile)
    d["selected_subjects"] = [s for s in (d.get("selected_subjects") or "").split(",") if s]
    return d


@app.put("/api/profile/subjects")
def update_profile_subjects(
    body: ProfileSubjectsRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Update only the user's selected_subjects."""
    selected = ",".join(body.selected_subjects) if body.selected_subjects else ""
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT id FROM profiles WHERE user_id = %s", (user_id,))
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE profiles SET selected_subjects = %s WHERE user_id = %s", (selected, user_id))
        else:
            cur.execute(
                """INSERT INTO profiles (user_id, name, avatar, grade, federal_state, learning_type, learning_goal, meta_prompt, selected_subjects)
                   VALUES (%s, '', 'fox', 2, '', 'kurz', 'noten', '', %s)""",
                (user_id, selected),
            )
    else:
        existing = conn.execute("SELECT id FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
        if existing:
            conn.execute("UPDATE profiles SET selected_subjects = ? WHERE user_id = ?", (selected, user_id))
        else:
            conn.execute(
                """INSERT INTO profiles (user_id, name, avatar, grade, federal_state, learning_type, learning_goal, meta_prompt, selected_subjects)
                   VALUES (?, '', 'fox', 2, '', 'kurz', 'noten', '', ?)""",
                (user_id, selected),
            )
        conn.commit()
    conn.close()
    return {"ok": True}


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


@app.get("/api/subjects/all")
def get_all_subjects(
    grade: int | None = None,
    user_id: int = Depends(get_current_user_id),
):
    """Returns ALL subjects that have knowledge files for the given grade (or user's profile grade)."""
    if grade is None:
        conn = get_db()
        if DATABASE_URL:
            cur = conn.cursor()
            cur.execute("SELECT grade FROM profiles WHERE user_id = %s", (user_id,))
            profile = cur.fetchone()
        else:
            profile = conn.execute("SELECT grade FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
        conn.close()
        grade = profile["grade"] if profile else 2
    available = []
    for subj_id, meta in SUBJECT_META.items():
        path = os.path.join(KNOWLEDGE_DIR, subj_id, f"klasse_{grade}.md")
        if os.path.exists(path):
            available.append({"id": subj_id, **meta})
    return available


@app.get("/api/subjects")
def get_subjects(user_id: int = Depends(get_current_user_id)):
    """Returns subjects filtered by user's selected_subjects preference."""
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT grade, selected_subjects FROM profiles WHERE user_id = %s", (user_id,))
        profile = cur.fetchone()
    else:
        profile = conn.execute("SELECT grade, selected_subjects FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    grade = profile["grade"] if profile else 2
    selected = [s for s in (profile["selected_subjects"] or "").split(",") if s] if profile else []
    available = []
    for subj_id, meta in SUBJECT_META.items():
        path = os.path.join(KNOWLEDGE_DIR, subj_id, f"klasse_{grade}.md")
        if not os.path.exists(path):
            continue
        # If user has a selection, only show those; otherwise show all available
        if selected and subj_id not in selected:
            continue
        available.append({"id": subj_id, **meta})
    return available


@app.get("/api/greeting")
def greeting(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
        profile = cur.fetchone()
    else:
        profile = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    if not profile:
        return {
            "name": "Lerner",
            "avatar": "fox",
            "streak": 0,
            "greeting_message": GREETINGS[0],
        }
    day_index = date.today().timetuple().tm_yday
    return {
        "name": profile["name"],
        "avatar": profile["avatar"],
        "streak": profile["streak"] or 0,
        "greeting_message": GREETINGS[day_index % len(GREETINGS)],
    }


# ── Chat helpers ──

PROMPT_DIR = os.path.join(os.path.dirname(__file__), "prompts")
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")


def load_system_prompt():
    path = os.path.join(PROMPT_DIR, "system_prompt.txt")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_knowledge(subject: str, grade: int) -> str:
    path = os.path.join(KNOWLEDGE_DIR, subject, f"klasse_{grade}.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return ""


def build_system_prompt(profile, course) -> str:
    template = load_system_prompt()
    knowledge = load_knowledge(course["subject"], profile["grade"])
    goal_text = ""
    if course["goal_type"]:
        goal_text = f"{course['goal_type']}"
        if course["goal_deadline"]:
            goal_text += f" bis {course['goal_deadline']}"
    return template.format(
        lehrplan_kontext=knowledge or "Kein spezifischer Lehrplan-Kontext verfuegbar.",
        meta_prompt=profile["meta_prompt"],
        fach=course["subject"],
        thema=course["topic"],
        lernziel=goal_text or course["topic"],
    )


def get_chat_history(conn, course_id: int, limit: int = 50) -> list[dict]:
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute(
            "SELECT role, content, image_base64 FROM messages WHERE course_id = %s ORDER BY created_at DESC LIMIT %s",
            (course_id, limit),
        )
        rows = cur.fetchall()
    else:
        rows = conn.execute(
            "SELECT role, content, image_base64 FROM messages WHERE course_id = ? ORDER BY created_at DESC LIMIT ?",
            (course_id, limit),
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def send_to_gemini(system_prompt: str, history: list[dict], user_message: str, image_base64: str | None = None) -> str:
    contents = []
    # Add history
    for msg in history:
        parts = [genai.types.Part(text=msg["content"])]
        
        img_b64 = msg.get("image_base64")
        if img_b64:
            hist_mime_type = "image/jpeg"
            if "," in img_b64:
                header, img_b64 = img_b64.split(",", 1)
                if "image/png" in header: hist_mime_type = "image/png"
                elif "image/webp" in header: hist_mime_type = "image/webp"
            try:
                hist_image_data = base64.b64decode(img_b64)
                parts.append(genai.types.Part.from_bytes(data=hist_image_data, mime_type=hist_mime_type))
            except Exception as e:
                print(f"History base64 decode error: {e}")
                
        contents.append(genai.types.Content(
            role="user" if msg["role"] == "user" else "model",
            parts=parts,
        ))
    
    # Build parts for the current message
    user_parts = [genai.types.Part(text=user_message)]
    
    if image_base64:
        # Detect mime type or assume image/jpeg
        mime_type = "image/jpeg"
        if "," in image_base64:
            header, image_base64 = image_base64.split(",", 1)
            if "image/png" in header: mime_type = "image/png"
            elif "image/webp" in header: mime_type = "image/webp"
        
        try:
            image_data = base64.b64decode(image_base64)
            user_parts.append(genai.types.Part.from_bytes(data=image_data, mime_type=mime_type))
            # Add vision-specific hint
            user_parts[0].text = f"[BILD] {user_message}"
        except Exception as e:
            print(f"Base64 decode error: {e}")

    # Add new user message
    contents.append(genai.types.Content(
        role="user",
        parts=user_parts,
    ))

    response = gemini_client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
        ),
    )
    return response.text or ""


# ── Course endpoints ──

@app.post("/api/courses")
def create_course(body: CourseRequest, user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user_id, body.subject, body.topic, body.goal_type, body.goal_deadline),
        )
        course_id = cur.fetchone()['id']
    else:
        cursor = conn.execute(
            "INSERT INTO courses (user_id, subject, topic, goal_type, goal_deadline) VALUES (?, ?, ?, ?, ?)",
            (user_id, body.subject, body.topic, body.goal_type, body.goal_deadline),
        )
        conn.commit()
        course_id = cursor.lastrowid
    conn.close()
    return {"id": course_id, "subject": body.subject, "topic": body.topic}


@app.get("/api/courses")
def list_courses(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, subject, topic, goal_type, goal_deadline, created_at FROM courses WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        )
        rows = cur.fetchall()
    else:
        rows = conn.execute(
            "SELECT id, subject, topic, goal_type, goal_deadline, created_at FROM courses WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/courses/{course_id}/messages")
def get_messages(course_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT * FROM courses WHERE id = %s AND user_id = %s", (course_id, user_id))
        course = cur.fetchone()
        if not course:
            conn.close()
            raise HTTPException(status_code=404, detail="Kurs nicht gefunden")
        cur.execute(
            "SELECT role, content, image_base64, created_at FROM messages WHERE course_id = %s ORDER BY created_at ASC",
            (course_id,),
        )
        rows = cur.fetchall()
    else:
        course = conn.execute("SELECT * FROM courses WHERE id = ? AND user_id = ?", (course_id, user_id)).fetchone()
        if not course:
            conn.close()
            raise HTTPException(status_code=404, detail="Kurs nicht gefunden")
        rows = conn.execute(
            "SELECT role, content, image_base64, created_at FROM messages WHERE course_id = ? ORDER BY created_at ASC",
            (course_id,),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Chat endpoints ──

@app.post("/api/chat")
def chat(body: ChatRequest, user_id: int = Depends(get_current_user_id)):
    conn = get_db()
    if DATABASE_URL:
        cur = conn.cursor()
        cur.execute("SELECT * FROM courses WHERE id = %s AND user_id = %s", (body.course_id, user_id))
        course = cur.fetchone()
        if not course:
            conn.close()
            raise HTTPException(status_code=404, detail="Kurs nicht gefunden")
        cur.execute("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
        profile = cur.fetchone()
    else:
        course = conn.execute("SELECT * FROM courses WHERE id = ? AND user_id = ?", (body.course_id, user_id)).fetchone()
        if not course:
            conn.close()
            raise HTTPException(status_code=404, detail="Kurs nicht gefunden")
        profile = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
        
    if not profile:
        conn.close()
        raise HTTPException(status_code=400, detail="Profil nicht gefunden – bitte Wizard durchlaufen")

    system_prompt = build_system_prompt(profile, course)
    history = get_chat_history(conn, body.course_id)

    try:
        ai_response = send_to_gemini(system_prompt, history, body.message, body.image_base64)
    except Exception as e:
        conn.close()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gemini-Fehler: {e}")

    # Save messages
    user_content = body.message
    if body.image_base64:
        user_content = f"📸 [Bild gesendet] {body.message}"

    if DATABASE_URL:
        cur.execute(
            "INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (%s, %s, 'user', %s, %s)",
            (body.course_id, user_id, user_content, body.image_base64),
        )
        cur.execute(
            "INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (%s, %s, 'assistant', %s, NULL)",
            (body.course_id, user_id, ai_response),
        )
    else:
        conn.execute(
            "INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (?, ?, 'user', ?, ?)",
            (body.course_id, user_id, user_content, body.image_base64),
        )
        conn.execute(
            "INSERT INTO messages (course_id, user_id, role, content, image_base64) VALUES (?, ?, 'assistant', ?, NULL)",
            (body.course_id, user_id, ai_response),
        )
        conn.commit()
    conn.close()
    return {"response": ai_response}


@app.post("/api/chat/hotkey")
def chat_hotkey(body: HotkeyRequest, user_id: int = Depends(get_current_user_id)):
    hotkey_messages = {
        "NEXT_STEP": "[HOTKEY:NEXT_STEP] Ich habe verstanden, zeige mir den naechsten Schritt.",
        "SIMPLIFY": "[HOTKEY:SIMPLIFY] Ich habe das nicht verstanden, erklaere es einfacher.",
        "EXAMPLE": "[HOTKEY:EXAMPLE] Zeig mir bitte ein konkretes Beispiel dazu.",
        "MORE_EXAMPLE": "[HOTKEY:MORE_EXAMPLE] Kannst du mir noch ein weiteres Beispiel geben?",
        "NEW_TOPIC": "[HOTKEY:NEW_TOPIC] Lass uns ein anderes Thema anschauen.",
    }
    message = hotkey_messages.get(body.hotkey_type)
    if not message:
        raise HTTPException(status_code=400, detail="Unbekannter Hotkey-Typ")
    chat_req = ChatRequest(course_id=body.course_id, message=message)
    return chat(chat_req, user_id)
