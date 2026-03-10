---
name: LUMI Lernplattform – Vollstaendige Umsetzung
overview: "Sprint-by-Sprint Implementierung der LUMI KI-Lernplattform. Monorepo mit React (Vite) Frontend + FastAPI Backend + Google Gemini 2.0 Flash. SSOT: docs/01-homepage-landing.md (Homepage, Auth, UI) und docs/02-ki-chat.md (KI-Chat, Wizard, Gamification). Regel: Sprint N+1 darf erst beginnen wenn Sprint N abgeschlossen ist."
todos:
  - id: sprint-1
    content: "Sprint 1: Projektsetup & Grundgeruest – Git init, .gitignore, Vite+React+TS+Tailwind Frontend scaffolden, Nunito Font, FastAPI Backend mit main.py + requirements.txt, .env mit GEMINI_API_KEY, Test-Endpoint /api/test-gemini, CORS konfigurieren, beide lokal startbar"
    status: completed
  - id: sprint-2
    content: "Sprint 2: Landingpage + Login + Routing – React Router (/, /login, /app, /app/wizard, /app/kurs/:id/chat, /app/blast), Landingpage (Hero, Features, So funktionierts, Footer), Login-Seite, Backend Auth-Endpoints (POST /api/auth/login + /register mit JWT), Demo-Account (lena@demo.de / 1234), SQLite users Tabelle, useAuth Hook, Protected Routes, Redirect-Logik (wizard_completed)"
    status: completed
  - id: sprint-3
    content: "Sprint 3: Onboarding-Wizard + Dashboard – Multi-Step Wizard (Name, Tier-Avatar aus 8 Tieren, Klassenstufe, Lerntyp+Lernziel), POST /api/profile/wizard Endpoint, Meta-Prompt Generierung, Dashboard UI (Avatar + Hallo Name + Fun-Spruch + Streak + Faecher-Bubbles im Wassertropfen-Design), GET /api/greeting Endpoint, 30+ Fun-Sprueche Rotation"
    status: in_progress
  - id: sprint-4
    content: "Sprint 4: KI-Chat Kern – Kurs-Erstellung mit Lueckentext-Prompt, GET+POST /api/courses, Chat UI (Nachrichtenverlauf + Input), HotKey-Buttons (Verstanden/Nicht verstanden/Beispiel/Bild), System-Prompt mit 3-Schritte-Methode (Grundlagen→Vertiefung→Uebung), Lehrplan-Kontext aus knowledge/ laden, POST /api/chat + /api/chat/hotkey Endpoints, Chat-Verlauf in SQLite messages Tabelle, Markdown-Rendering mit react-markdown"
    status: pending
  - id: sprint-5
    content: "Sprint 5: Bilderkennung + Spracheingabe – Bild-Upload UI im Chat (Datei-Auswahl + Vorschau), Base64 an Gemini Vision senden, Bilderkennungs-Prompt, Mikrofon-Button mit Web Speech API SpeechRecognition (STT), Lautsprecher-Button mit speechSynthesis (TTS, Emojis/Markdown entfernen)"
    status: pending
  - id: sprint-6
    content: "Sprint 6: Gamification – Streak-Logik Backend (last_active_date pruefen, +1 bei gestern, reset bei aelter), Streak im Dashboard anzeigen, Blast Game mit HTML5 Canvas (Weltraum, Raumschiff, 4 Antwort-Bubbles, Winkelsteuerung, +10/-5 Punkte, 10 Aufgaben pro Runde), Frontend-generierte Grundrechenarten, POST /api/blast/result"
    status: pending
  - id: sprint-7
    content: "Sprint 7: Deployment – npm run build, GitHub Pages einrichten (gh-pages Branch oder Actions), vite base konfigurieren, VITE_API_URL auf Azure setzen, Azure App Service F1 Free Tier erstellen (Python 3.11, West Europe), Backend deployen, Environment Variables in Azure, CORS fuer Produktion, End-to-End Test"
    status: pending
isProject: true
---

# LUMI Lernplattform – Sprint-by-Sprint Umsetzung

> **WICHTIG:** Dieses Dokument ist der ausfuehrbare Implementierungsplan. Die SSOT (Single Source of Truth) fuer alle technischen Details sind:
>
> - `docs/01-homepage-landing.md` – Homepage, Routing, Auth, UI/UX, Projektstruktur
> - `docs/02-ki-chat.md` – KI-Chat, Wizard, Socratic Tutoring, Gamification, System-Prompt
>
> **Regel:** Sprint N+1 wird NICHT begonnen bevor Sprint N vollstaendig abgeschlossen ist.

---

## Globaler Kontext

### Tech-Stack


| Komponente | Technologie               | Version/Details                                          |
| ---------- | ------------------------- | -------------------------------------------------------- |
| Frontend   | React + TypeScript (Vite) | `npm create vite@latest frontend -- --template react-ts` |
| Styling    | TailwindCSS               | v3+                                                      |
| Font       | Nunito (Google Fonts)     | Sans-Serif, grosse Schrift (18px+ Body, 24px+ Headlines) |
| Backend    | FastAPI (Python)          | Alles in einer `main.py`                                 |
| LLM        | Google Gemini 2.0 Flash   | `google-generativeai` Python SDK                         |
| Datenbank  | SQLite                    | `lumi.db`, wird automatisch erstellt                     |
| Auth       | JWT (PyJWT)               | Einfach, kein OAuth, kein Refresh                        |
| Blast Game | HTML5 Canvas              | Nativ im Browser                                         |
| STT/TTS    | Web Speech API            | Browser-nativ, kostenlos                                 |


**NICHT verwenden:** Docker, ChromaDB, LangChain, PostgreSQL, CI/CD, komplexe Microservices, RAG.

### Projektstruktur (Ziel)

```
uni-lumi-ki-lernplattform/
├── frontend/
│   ├── src/
│   │   ├── components/        # Header, Bubbles, Chat, Wizard, BlastGame, HotKeys
│   │   ├── pages/             # LandingPage, LoginPage, AppPage, WizardPage, ChatPage, BlastPage
│   │   ├── hooks/useAuth.ts   # Auth-State (Token, User, Login/Logout)
│   │   ├── services/api.ts    # Alle API-Calls zum Backend
│   │   ├── App.tsx            # React Router
│   │   ├── index.css          # Tailwind + Nunito Import
│   │   └── main.tsx           # Entry Point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── main.py                # FastAPI – ALLES in einer Datei
│   ├── knowledge/             # Lehrplan-Kontext als .md
│   │   └── mathe/klasse_7.md
│   ├── prompts/
│   │   └── system_prompt.txt
│   ├── lumi.db                # SQLite (automatisch erstellt)
│   ├── .env                   # GEMINI_API_KEY=...
│   └── requirements.txt
├── docs/
│   ├── 01-homepage-landing.md
│   ├── 02-ki-chat.md
│   └── 03-umsetzung.md
├── .env.example
├── .gitignore
└── README.md
```

### UI/UX Design-Regeln

- **Font:** Nunito (Google Fonts) – rund, freundlich, gut lesbar
- **Schriftgroesse:** min. 18px Body, 24px+ Headlines
- **Kindgerecht aber professionell:** Verspielt, Tier-Avatare, aber nicht albern
- **Wenig Text, viel visuell:** Bubbles, Emojis, Farben, kurze Saetze
- **Mobile-First:** Responsive fuer Tablet + Desktop

**Farbpalette:**


| Farbe          | Hex       | Verwendung           |
| -------------- | --------- | -------------------- |
| Primary Blue   | `#4F46E5` | Buttons, Links       |
| Secondary Mint | `#10B981` | Erfolg, Fortschritt  |
| Warm Orange    | `#F59E0B` | Gamification, Streak |
| Neutral Gray   | `#F3F4F6` | Hintergruende        |
| Dark Text      | `#1F2937` | Fliesstext           |


**Tier-Avatare (8 Stueck, im Wizard waehlbar):**


| Tier         | Emoji | Farbe   |
| ------------ | ----- | ------- |
| Fuchs        | 🦊    | Orange  |
| Eule         | 🦉    | Braun   |
| Panda        | 🐼    | Schwarz |
| Delfin       | 🐬    | Blau    |
| Katze        | 🐱    | Gelb    |
| Schildkroete | 🐢    | Gruen   |
| Pinguin      | 🐧    | Dunkel  |
| Hase         | 🐰    | Rosa    |


### API-Endpunkte (alle)


| Methode | Endpunkt              | Was                                          | Sprint |
| ------- | --------------------- | -------------------------------------------- | ------ |
| POST    | `/api/auth/login`     | Login → JWT Token                            | 2      |
| POST    | `/api/auth/register`  | Registrierung                                | 2      |
| POST    | `/api/profile/wizard` | Wizard-Daten speichern (inkl. Avatar)        | 3      |
| GET     | `/api/greeting`       | Begruessung + Streak + Avatar + Fun-Spruch   | 3      |
| GET     | `/api/courses`        | Kurse auflisten                              | 4      |
| POST    | `/api/courses`        | Neuen Kurs erstellen                         | 4      |
| POST    | `/api/chat`           | Nachricht senden (Text + Bild) → KI-Antwort  | 4      |
| POST    | `/api/chat/hotkey`    | HotKey-Aktion (NEXT_STEP, SIMPLIFY, EXAMPLE) | 4      |
| POST    | `/api/blast/result`   | Blast-Ergebnis speichern                     | 6      |


### SQLite-Tabellen

```sql
-- Sprint 2
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    wizard_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprint 3
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id),
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,           -- z.B. "fox", "owl", "panda"
    grade INTEGER NOT NULL,         -- Klasse 5-10
    learning_type TEXT NOT NULL,    -- visuell/auditiv/haptisch/lesen_schreiben
    learning_goal TEXT NOT NULL,    -- noten/pruefung/neugier
    meta_prompt TEXT NOT NULL,      -- generierter Meta-Prompt-String
    streak INTEGER DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprint 4
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    subject TEXT NOT NULL,           -- mathe/deutsch/englisch
    topic TEXT NOT NULL,
    goal_type TEXT,                  -- uebung/hausaufgabe/pruefung
    goal_deadline TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    user_id INTEGER REFERENCES users(id),
    role TEXT NOT NULL,              -- "user" oder "assistant"
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprint 6
CREATE TABLE blast_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    score INTEGER NOT NULL,
    total_questions INTEGER DEFAULT 10,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### System-Prompt (exakt so in `prompts/system_prompt.txt`)

```
Du bist LUMI, ein freundlicher Lerntutor fuer Schueler der Klassen 5–10.

REGELN:
1. Antworte NIEMALS direkt mit der Loesung.
2. Teile JEDE Erklaerung in genau 3 Schritte:
   - Schritt 1: GRUNDLAGEN (Begriffe, Regeln, Grundidee)
   - Schritt 2: VERTIEFUNG (Beispiel, Zusammenhaenge)
   - Schritt 3: UEBUNG (Eigene Aufgabe loesen)
3. Zeige nur EINEN Schritt auf einmal. Warte auf den Schueler.
4. Stelle am Ende JEDES Schritts eine Rueckfrage.
5. Halte dich KURZ: Max. 2–3 Saetze pro Absatz.
6. Nutze Emojis als visuelle Anker (📐 🔍 🎯 🤔 💡 ✅ ✨ 💪).
7. Nutze **Bold** fuer Schluesselbegriffe.
8. Sei ermutigend und positiv. Kein Notendruck.
9. Passe die Sprache an die Klassenstufe an.

HOTKEYS (wenn der Schueler diese sendet):
- [HOTKEY:NEXT_STEP] → Zeige den naechsten Schritt.
- [HOTKEY:SIMPLIFY] → Erklaere den gleichen Schritt einfacher.
- [HOTKEY:EXAMPLE] → Zeige ein konkretes Beispiel.

PAEDAGOGISCHER KONTEXT:
{lehrplan_kontext}

META-KONTEXT:
{meta_prompt_aus_wizard}

KURS-KONTEXT:
Fach: {fach}, Thema: {thema}
Lernziel: {lueckentext_prompt}
```

### requirements.txt (Backend)

```
fastapi
uvicorn[standard]
google-generativeai
python-multipart
pyjwt
passlib[bcrypt]
python-dotenv
```

---

## Sprint 1: Projektsetup & Grundgeruest

**Ziel:** Repo steht, Frontend + Backend laufen lokal, Gemini API Key funktioniert.

### Aufgaben

1. **Git init + .gitignore** mit: `node_modules/`, `__pycache__/`, `.env`, `lumi.db`, `dist/`, `.vite/`, `*.pyc`
2. **Frontend scaffolden:**
  - `npm create vite@latest frontend -- --template react-ts`
  - TailwindCSS installieren: `npm install -D tailwindcss @tailwindcss/vite`
  - `tailwind.config.js` konfigurieren mit content paths
  - `index.css`: Tailwind directives + Google Fonts Nunito import
  - Nunito als default font in tailwind config: `fontFamily: { sans: ['Nunito', 'sans-serif'] }`
  - Basis-Schriftgroesse 18px im body
3. **Backend scaffolden:**
  - `backend/main.py` mit FastAPI Hello World (`@app.get("/")` → `{"message": "LUMI API"}`)
  - `backend/requirements.txt` mit allen Dependencies (siehe oben)
  - `backend/.env` mit `GEMINI_API_KEY=dein_key_hier`
4. **Gemini Test-Endpoint:**
  - In `main.py`: `@app.get("/api/test-gemini")` der einen simplen Prompt an Gemini sendet und die Antwort zurueckgibt
  - `import google.generativeai as genai`, `genai.configure(api_key=...)`, `model = genai.GenerativeModel("gemini-2.0-flash")`, `model.generate_content("Hallo, wer bist du?")`
5. **CORS:** `from fastapi.middleware.cors import CORSMiddleware`, origins = `["http://localhost:5173"]`
6. **Testen:** Backend auf Port 8000, Frontend auf Port 5173, `/api/test-gemini` gibt Gemini-Antwort

### Abnahme

- `npm run dev` startet ohne Fehler
- `uvicorn main:app --reload` startet ohne Fehler
- Browser zeigt React-App mit Nunito Font
- `/api/test-gemini` gibt eine Gemini-Antwort zurueck

---

## Sprint 2: Landingpage + Login + Routing

**Ziel:** Landingpage steht, Login funktioniert mit Demo-Account, Routing zu /app.

### Aufgaben

1. **React Router installieren:** `npm install react-router-dom`
2. **App.tsx Routing:**
  - `/` → LandingPage
  - `/login` → LoginPage
  - `/app` → AppPage (Protected Route)
  - `/app/wizard` → WizardPage (Protected Route)
  - `/app/kurs/:id/chat` → ChatPage (Protected Route)
  - `/app/blast` → BlastPage (Protected Route)
3. **LandingPage (`pages/LandingPage.tsx`):**
  - Hero-Section: "LUMI – Dein KI-Lernbuddy" + CTA "Jetzt starten" → Link zu `/login`
  - Features-Section: 4 Karten (Socratic Tutoring, Bilderkennung, Gamification, Spracheingabe) mit Tier-Emojis
  - "So funktioniert's": 3 Schritte (1. Anmelden, 2. Fach waehlen, 3. Lernen mit KI)
  - Footer: Impressum, Datenschutz (Platzhalter)
  - Freundliche Tier-Illustrationen (Emojis) in der Hero-Section
4. **LoginPage (`pages/LoginPage.tsx`):**
  - E-Mail + Passwort Formular, Submit-Button
  - Fehleranzeige bei falschem Login
  - Nach Login: Backend gibt `{token, user, wizard_completed}` zurueck
  - Wenn `wizard_completed === false` → `/app/wizard`
  - Wenn `wizard_completed === true` → `/app`
5. **Backend Auth-Endpoints in `main.py`:**
  - SQLite Tabelle `users` erstellen (beim App-Start)
  - `POST /api/auth/register` – E-Mail + Passwort, Passwort hashen mit `passlib.hash.bcrypt`, speichern
  - `POST /api/auth/login` – E-Mail + Passwort pruefen, JWT-Token mit `pyjwt` erstellen, zurueckgeben: `{"token": "...", "user_id": 1, "wizard_completed": false}`
  - Demo-Account beim Start anlegen: `lena@demo.de` / Passwort `1234`
  - JWT-Secret aus `.env` oder Hardcoded fuer Pitch
6. **useAuth Hook (`hooks/useAuth.ts`):**
  - Token in localStorage speichern/lesen/loeschen
  - `login(email, password)` → API Call → Token speichern
  - `logout()` → Token loeschen → Redirect zu `/`
  - `isAuthenticated` Boolean
  - `user` Objekt (user_id, wizard_completed)
7. **API Service (`services/api.ts`):**
  - Basis-URL: `http://localhost:8000`
  - Fetch-Wrapper der automatisch `Authorization: Bearer <token>` Header setzt
8. **Protected Route Komponente:**
  - Wenn nicht eingeloggt → Redirect zu `/login`

### Abnahme

- Landingpage rendert mit Hero, Features, Footer, Tier-Emojis
- Login mit `lena@demo.de` / `1234` funktioniert
- JWT-Token wird in localStorage gespeichert
- Redirect zu `/app/wizard` bei erstem Login
- Nicht-eingeloggte User werden von `/app` auf `/login` umgeleitet

---

## Sprint 3: Onboarding-Wizard + Dashboard

**Ziel:** Neuer User durchlaeuft Wizard, waehlt Tier-Avatar, sieht danach Dashboard mit Begruessung + Faecher-Bubbles.

### Aufgaben

1. **WizardPage (`pages/WizardPage.tsx`):**
  - Multi-Step-Form mit 4 Schritten:
    - Schritt 1: "Wie heisst du?" → Name Eingabefeld
    - Schritt 2: "Waehle dein Tier!" → Grid mit 8 Tieren (Fuchs 🦊, Eule 🦉, Panda 🐼, Delfin 🐬, Katze 🐱, Schildkroete 🐢, Pinguin 🐧, Hase 🐰) – gross, klickbar, selektiertes Tier hervorgehoben
    - Schritt 3: "Welche Klasse?" → Dropdown oder Buttons fuer Klasse 5–10
    - Schritt 4: "Wie lernst du am liebsten?" → Lerntyp (Visuell/Auditiv/Haptisch/Lesen-Schreiben) + Lernziel (Noten/Pruefung/Neugier)
  - Weiter/Zurueck Buttons
  - Am Ende: POST an `/api/profile/wizard`
  - Nach Absenden: Redirect zu `/app`
2. **Backend: POST `/api/profile/wizard`:**
  - Empfaengt: `{name, avatar, grade, learning_type, learning_goal}`
  - Generiert Meta-Prompt String: z.B. `"Der Schueler heisst Lena, Klasse 7. Lerntyp: visuell → nutze Diagramme und bildhafte Vergleiche. Lernziel: Klassenarbeit vorbereiten. Sprache: freundlich, ermutigend, altersgerecht."`
  - Speichert alles in `profiles` Tabelle
  - Setzt `wizard_completed = true` in `users` Tabelle
3. **AppPage / Dashboard (`pages/AppPage.tsx`):**
  - Oben: Tier-Avatar (gross) + "Hallo [Name]!" + taeglich wechselnder Fun-Spruch + 🔥 Streak: X Tage
  - Darunter: 3 Faecher-Bubbles (Wassertropfen-Design)
    - 💧 Mathe (blau) – mit zusaetzlichem 🚀 Blast-Icon
    - 💧 Deutsch (gruen)
    - 💧 Englisch (rot)
  - Klick auf Bubble → Navigiert zu Kurs-Uebersicht (Sprint 4)
  - Klick auf Blast-Icon → `/app/blast`
4. **Backend: GET `/api/greeting`:**
  - Gibt zurueck: `{name, avatar, streak, greeting_message}`
  - `greeting_message` rotiert taeglich aus einer Liste von 30+ Fun-Spruechen
  - Spruch-Auswahl: `sprueche[day_of_year % len(sprueche)]`
  - Beispiel-Sprueche: "Mathe ist wie Kochen – man braucht die richtigen Zutaten! 🧑‍🍳", "Wer lernt, hat morgen weniger Panik! 😄", "Dein Gehirn ist ein Muskel – trainier es! 💪", etc.
5. **Header-Komponente:** Zeigt Avatar + Name + Logout-Button auf allen /app/* Seiten

### Abnahme

- Wizard: alle 4 Schritte durchlaufen, Tier-Auswahl funktioniert
- Wizard-Daten werden im Backend gespeichert
- Dashboard zeigt Avatar + "Hallo [Name]" + Spruch + Streak
- 3 Faecher-Bubbles sichtbar, klickbar
- Mathe-Bubble hat Blast-Game-Icon

---

## Sprint 4: KI-Chat (Kern)

**Ziel:** Funktionsfaehiger Chat mit Gemini, 3-Schritte-Methode, HotKeys, Kurs-Erstellung.

### Aufgaben

1. **Kurs-Erstellung:**
  - Beim Klick auf Fach-Bubble: Modal/Seite mit Lueckentext-Prompt:

```
     "Ich moechte fuer eine _______ lernen. Im Fach _______ bis _______."
     

```

- Felder: Typ (Uebung/Hausaufgabe/Pruefung), Thema (Freitext), Deadline (Freitext)
- POST `/api/courses` → neuer Kurs erstellt → Redirect zu `/app/kurs/:id/chat`

1. **Backend: Kurs-Endpoints:**
  - `POST /api/courses` – erstellt Kurs in SQLite, gibt `{id, subject, topic}` zurueck
  - `GET /api/courses` – listet alle Kurse des Users auf
2. **ChatPage (`pages/ChatPage.tsx`):**
  - Nachrichten-Verlauf: Abwechselnd User (rechts) und LUMI (links, mit Avatar-Emoji)
  - Input-Feld unten + Senden-Button
  - Beim Laden: GET bestehende Messages fuer diesen Kurs
  - Beim Senden: POST `/api/chat` mit `{course_id, message}` → Antwort anzeigen
3. **HotKey-Buttons Komponente:**
  - Erscheinen unter JEDER LUMI-Antwort:
    - ✅ "Verstanden, weiter" → sendet `[HOTKEY:NEXT_STEP]`
    - ❓ "Nicht verstanden" → sendet `[HOTKEY:SIMPLIFY]`
    - 💡 "Zeig Beispiel" → sendet `[HOTKEY:EXAMPLE]`
    - 📸 "Bild hochladen" → oeffnet Datei-Upload (Sprint 5)
4. **System-Prompt anlegen:**
  - Datei `backend/prompts/system_prompt.txt` mit dem exakten System-Prompt (siehe oben im Globalen Kontext)
  - Beim Chat: System-Prompt laden, Platzhalter ersetzen ({lehrplan_kontext}, {meta_prompt_aus_wizard}, {fach}, {thema}, {lueckentext_prompt})
5. **Lehrplan-Kontext:**
  - Mindestens eine Datei: `backend/knowledge/mathe/klasse_7.md` mit Mathe-Lehrplan Klasse 7 Grundlagen (Bruchrechnung, Gleichungen, Prozentrechnung, Geometrie)
  - Beim Chat laden: Datei lesen basierend auf Fach + Klassenstufe des Users
6. **Backend: POST `/api/chat`:**
  - Empfaengt: `{course_id, message, image_base64?}`
  - Laedt: System-Prompt, Lehrplan-Kontext, Meta-Prompt des Users, Kurs-Kontext
  - Baut den vollen Prompt zusammen
  - Laedt bisherigen Chat-Verlauf (Messages) fuer Kontext
  - Sendet an Gemini: `model.generate_content(...)` mit Chat-History
  - Speichert User-Nachricht + LUMI-Antwort in `messages` Tabelle
  - Gibt LUMI-Antwort zurueck
7. **Backend: POST `/api/chat/hotkey`:**
  - Empfaengt: `{course_id, hotkey_type}` (NEXT_STEP, SIMPLIFY, EXAMPLE)
  - Sendet den Hotkey-Token als User-Nachricht an Gemini im bestehenden Chat-Kontext
  - Speichert und gibt Antwort zurueck
8. **Markdown-Rendering:**
  - `npm install react-markdown` im Frontend
  - LUMI-Antworten werden als Markdown gerendert (Bold, Emojis, Listen, Absaetze)

### Abnahme

- Kurs-Erstellung mit Lueckentext funktioniert
- Chat sendet Nachricht → Gemini antwortet
- LUMI antwortet mit Schritt 1 (Grundlagen) zuerst, kurz und knackig
- "Verstanden" → Schritt 2 (Vertiefung)
- "Nicht verstanden" → einfachere Erklaerung
- Chat-Verlauf wird gespeichert und beim Laden angezeigt
- Markdown (Bold, Emojis) rendert korrekt

---

## Sprint 5: Bilderkennung + Spracheingabe

**Ziel:** User kann Fotos von Arbeitsblaettern hochladen, per Sprache eingeben, und Antworten vorlesen lassen.

### Aufgaben

1. **Bild-Upload UI:**
  - 📸 Button im Chat (neben HotKeys oder im Input-Bereich)
  - Klick → `<input type="file" accept="image/*" capture="environment">` (oeffnet Kamera auf Mobil)
  - Vorschau des Bildes vor dem Senden
  - Bild wird als Base64 kodiert und mit der Nachricht gesendet
2. **Backend Bild-Verarbeitung (bereits in `/api/chat`):**
  - Wenn `image_base64` vorhanden: Base64 dekodieren → als `PIL.Image` oder direkt als bytes
  - An Gemini Vision senden: `model.generate_content([prompt_text, image_part])`
  - Spezieller Bilderkennungs-Prompt-Prefix: "Der Schueler hat ein Foto hochgeladen. Analysiere den Inhalt (Handschrift, Text, Grafiken, Diagramme) und hilf mit sokratischen Fragen."
3. **Spracheingabe (STT):**
  - Mikrofon-Button 🎤 neben dem Chat-Input
  - Klick → `new SpeechRecognition()` / `webkitSpeechRecognition` starten
  - `lang = "de-DE"`
  - Erkannter Text erscheint im Input-Feld
  - User kann Text editieren und dann senden
  - Visuelles Feedback: Button pulsiert rot waehrend Aufnahme
4. **Vorlesen (TTS):**
  - Lautsprecher-Icon 🔊 neben jeder LUMI-Antwort
  - Klick → `speechSynthesis.speak(new SpeechSynthesisUtterance(cleanText))`
  - `cleanText`: Emojis entfernen (Regex `[\u{1F600}-\u{1F9FF}]`), Markdown-Syntax entfernen (**, #, -, etc.)
  - `lang = "de-DE"`

### Abnahme

- 📸 Button oeffnet Datei-Auswahl, Vorschau wird gezeigt
- Hochgeladenes Bild wird von Gemini Vision analysiert
- LUMI erkennt Inhalt (Handschrift, Text, Grafiken)
- 🎤 Mikrofon startet Spracherkennung (Chrome/Edge)
- 🔊 Lautsprecher liest Antwort vor (ohne Emojis/Markdown)

---

## Sprint 6: Gamification (Streak + Blast Game)

**Ziel:** Streak zaehlt korrekt, Blast Game ist spielbar.

### Aufgaben

1. **Streak-Logik im Backend:**
  - Bei jeder Chat-Nachricht oder Blast-Runde: `last_active_date` des Users pruefen
  - Gleicher Tag → nichts tun
  - Gestern → `streak += 1`, `last_active_date = today`
  - Aelter als gestern → `streak = 1`, `last_active_date = today`
  - Noch nie aktiv → `streak = 1`, `last_active_date = today`
  - Streak wird im Dashboard ueber `/api/greeting` angezeigt
2. **Streak-Anzeige:** 🔥 Streak: X Tage – prominent im Dashboard
3. **BlastPage (`pages/BlastPage.tsx`):**
  - Nur ueber Mathe-Bubble erreichbar
  - HTML5 Canvas Element (z.B. 800x600 oder responsive)
  - **Spielfeld:** Dunkler Weltraum-Hintergrund (CSS Gradient oder einfaches Canvas-Fill)
  - **Raumschiff (Blaster):** Unten mittig, dreieckige Form
  - **4 Antwort-Bubbles:** Kreise mit Zahl drin, schweben langsam von oben nach unten oder seitlich
  - **Steuerung:** Maus links/rechts → Blaster-Winkel kippen. Klick → Laserstrahl/Projektil schiessen
  - **Treffer-Erkennung:** Wenn Projektil eine Bubble trifft
    - Richtige Antwort → +10 Punkte, gruener Effekt, naechste Aufgabe
    - Falsche Antwort → -5 Punkte, roter Effekt, Bubble verschwindet, weiter schiessen
  - **10 Aufgaben pro Runde**
4. **Aufgaben-Generierung (Frontend, kein API-Call):**
  - Zufaellige einfache Grundrechenarten: `a + b`, `a - b`, `a × b`, `a ÷ b`
  - Zahlenbereich: 1–100 fuer +/-, 2–12 fuer ×/÷
  - 4 Antwort-Optionen generieren: 1 richtig + 3 falsche (nah an der richtigen Antwort)
  - Schwierigkeit: immer konstant, KEIN Skalieren nach Klassenstufe
5. **Ergebnis-Screen:** Nach 10 Aufgaben: Gesamtpunkte, Sterne-Bewertung (visuell), "Nochmal?" Button
6. **Backend: POST `/api/blast/result`:**
  - Empfaengt: `{score, total_questions}`
  - Speichert in `blast_results`
  - Aktualisiert Streak (falls noch nicht heute)

### Abnahme

- Streak zaehlt korrekt (+1 bei taeglicher Nutzung, Reset bei Pause)
- Dashboard zeigt 🔥 Streak: X Tage
- Blast Game startet ueber Mathe-Bubble
- Canvas rendert: Weltraum, Raumschiff, 4 Bubbles mit Zahlen
- Steuerung: Maus → Winkel, Klick → schiessen
- Punkte: +10 richtig, -5 falsch
- Nach 10 Aufgaben: Ergebnis-Screen
- Ergebnis wird ans Backend gesendet

---

## Sprint 7: Deployment (GitHub Pages + Azure)

**Ziel:** Frontend oeffentlich erreichbar, Backend auf Azure, alles funktioniert end-to-end.

### Aufgaben

1. **Frontend Build:** `npm run build` → `dist/` Ordner
2. **vite.config.ts:** `base: '/uni-lumi-ki-lernplattform/'` setzen (fuer GitHub Pages Subpath)
3. **Environment Variable:** `VITE_API_URL` in `.env.production` → Azure Backend URL
4. `**services/api.ts` anpassen:** Basis-URL aus `import.meta.env.VITE_API_URL || 'http://localhost:8000'`
5. **GitHub Pages:**
  - Repo auf GitHub pushen
  - GitHub Pages aktivieren (Settings → Pages → Source: GitHub Actions)
  - GitHub Action erstellen: `.github/workflows/deploy.yml` – baut Frontend und deployed nach `gh-pages`
  - ODER: `npm install -D gh-pages`, Script in `package.json`: `"deploy": "gh-pages -d dist"`
6. **Azure App Service:**
  - Azure Portal → "App Service" erstellen → F1 Free Tier → Python 3.11 → Region: West Europe
  - Deployment: `az webapp up --name lumi-api --runtime "PYTHON:3.11"` ODER GitHub Actions
  - Startup Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
7. **Azure Environment Variables:** Im Azure Portal → Configuration → Application Settings:
  - `GEMINI_API_KEY` = dein Key
  - `JWT_SECRET` = geheimer String
  - `CORS_ORIGINS` = `https://<user>.github.io`
8. **CORS fuer Produktion:** Backend liest `CORS_ORIGINS` aus Environment Variable
9. **SQLite auf Azure:** Datei liegt im App Service Filesystem. Reicht fuer MVP. NICHT persistent bei Scale-down – akzeptabel fuer Pitch.
10. **End-to-End Test:** Login → Wizard → Dashboard → Chat → Blast Game – alles ueber die deployed Version

### Abnahme

- Frontend unter `https://<user>.github.io/uni-lumi-ki-lernplattform/` erreichbar
- Backend unter `https://lumi-api.azurewebsites.net` erreichbar
- Login mit Demo-Account funktioniert
- Chat mit Gemini funktioniert
- Blast Game funktioniert
- Keine CORS-Fehler

