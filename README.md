# LUMI – KI-Lernplattform für Grundschüler 🐬

LUMI ist eine innovative, KI-gestützte Nachhilfeplattform, die speziell für Schüler der Klassen 1–4 entwickelt wurde. Das System kombiniert modernste KI-Technologie (Gemini 2.0) mit pädagogischen Konzepten wie personalisierten Lernpfaden und Gamification.

## 🚀 Features
- **Intelligentes Tutoring:** Adaptive Lernbegleitung durch Google Gemini 2.0 Flash.
- **Multimodale Interaktion:** Unterstützung für Bilderkennung (z.B. Fotos von Hausaufgaben) und Spracheingabe.
- **Personalisierung:** Individueller Wizard zur Erfassung von Lernstand, Bundesland und Lerntyp.
- **Gamification:** "LUMI Blast" Mathe-Spiel mit klassenstufenspezifischen Aufgaben.
- **Sicherheit:** Firebase-basierter Google Sign-In und sichere Cloud-Datenhaltung.

## 🛠 Tech-Stack
### Frontend
- **Framework:** React 18 mit TypeScript (Vite)
- **Styling:** TailwindCSS (modernes, kindgerechtes Design)
- **Auth:** Firebase Authentication (Google OAuth 2.0)
- **State:** React Hooks & Custom Auth Provider

### Backend
- **Framework:** FastAPI (Python 3.12)
- **KI-Integration:** Google GenAI SDK (Gemini 2.0 Flash)
- **Datenbank:** Hybrid-Setup (SQLite für lokale Entwicklung, PostgreSQL/Neon für Produktion)
- **Sicherheit:** Firebase Admin SDK zur Token-Verifizierung

## 🏗 Architektur
Das System folgt einer modernen Client-Server-Architektur:
1. **Frontend:** Statisch gehostet, kommuniziert via REST-API mit dem Backend.
2. **Backend:** Stateless API, verifiziert Firebase-Tokens und orchestriert KI-Anfragen.
3. **Persistenz:** Relationale Datenbank zur Speicherung von Profilen, Kursen und Chat-Historien.

## ⚙️ Setup & Deployment
### Lokal
1. Backend: `pip install -r requirements.txt` -> `uvicorn main:app --reload`
2. Frontend: `npm install` -> `npm run dev`

### Produktion (Render + Neon)
- **Frontend:** Erfordert `VITE_API_URL` als Umgebungsvariable beim Build.
- **Backend:** Erfordert `DATABASE_URL` (Postgres), `GEMINI_API_KEY` und `FIREBASE_SERVICE_ACCOUNT_JSON`.

## 🎓 Akademischer Kontext
Dieses Projekt wurde im Rahmen des Studiums entwickelt. Besonderer Fokus lag auf der **Clean Code Architektur**, der **Sicherheit sensibler Nutzerdaten** (DSGVO-konforme Auth-Logik) und der **Skalierbarkeit** durch Cloud-native Dienste.

---
Developed with ❤️ 
