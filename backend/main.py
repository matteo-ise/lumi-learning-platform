import os
import sqlite3
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

DB_PATH = os.path.join(os.path.dirname(__file__), "lumi.db")
JWT_SECRET = os.getenv("JWT_SECRET", "lumi-dev-secret-key")
JWT_ALGORITHM = "HS256"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
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
    # Demo account
    existing = conn.execute("SELECT id FROM users WHERE email = ?", ("lena@demo.de",)).fetchone()
    if not existing:
        pw_hash = hashlib.sha256("1234".encode()).hexdigest()
        conn.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", ("lena@demo.de", pw_hash))
        conn.commit()
    # Migrate: add federal_state column if missing (for existing DBs)
    try:
        conn.execute("ALTER TABLE profiles ADD COLUMN federal_state TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # Column already exists
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="LUMI API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
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


# ── Routes ──

@app.get("/")
def root():
    return {"message": "LUMI API"}


@app.get("/api/test-gemini")
async def test_gemini():
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Sag kurz Hallo und stell dich als LUMI vor – ein freundlicher Lerntutor.",
    )
    return {"response": response.text}


@app.post("/api/auth/register")
def register(body: AuthRequest):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    cursor = conn.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (body.email, pw_hash),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return {"token": create_token(user_id), "user_id": user_id, "wizard_completed": False}


@app.post("/api/auth/login")
def login(body: AuthRequest):
    conn = get_db()
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
    conn = get_db()
    existing = conn.execute("SELECT id FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if existing:
        conn.execute(
            """UPDATE profiles SET name=?, avatar=?, grade=?, federal_state=?,
               learning_type=?, learning_goal=?, meta_prompt=? WHERE user_id=?""",
            (body.name, body.avatar, body.grade, body.federal_state,
             body.learning_type, body.learning_goal, meta_prompt, user_id),
        )
    else:
        conn.execute(
            """INSERT INTO profiles (user_id, name, avatar, grade, federal_state,
               learning_type, learning_goal, meta_prompt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, body.name, body.avatar, body.grade, body.federal_state,
             body.learning_type, body.learning_goal, meta_prompt),
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


@app.get("/api/greeting")
def greeting(user_id: int = Depends(get_current_user_id)):
    conn = get_db()
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
