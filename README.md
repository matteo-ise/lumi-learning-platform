# LUMI – KI-Lernplattform für Grundschüler 🐬

LUMI ist eine innovative, KI-gestützte Nachhilfeplattform, die speziell für Schüler der Klassen 1–4 entwickelt wurde. Das System kombiniert modernste KI-Technologie (Gemini 2.0) mit pädagogischen Konzepten wie personalisierten Lernpfaden und Gamification.

## 🚀 Features
- **Intelligentes Tutoring:** Adaptive Lernbegleitung durch Google Gemini 2.0 Flash mit der **3-Schritte-Methode** (Grundlagen, Vertiefung, Übung).
- **Sokratisches Prinzip:** LUMI gibt nie direkt die Lösung, sondern führt Schüler durch gezielte Rückfragen zum Ziel.
- **Multimodale Interaktion:** Unterstützung für Bilderkennung (Fotos von Hausaufgaben via Gemini Vision), Spracheingabe (STT) und Vorlesefunktion (TTS).
- **Personalisierung:** Individueller Onboarding-Wizard zur Erfassung von Name, Avatar, Klassenstufe (1–4), Bundesland und Lerntyp.
- **Gamification:** 
  - **LUMI Blast:** Ein Mathe-Shooter-Spiel mit klassenstufenspezifischen Aufgaben.
  - **Streak-System:** Motivation durch tägliche Lern-Streaks.
- **Sicherheit:** Firebase-basierter Google Sign-In und sichere Cloud-Datenhaltung.
- **iPad-Optimierung:** Karo-Papier-Design im Chat für die Nutzung mit dem Apple Pencil.

## 🛠 Tech-Stack
### Frontend
- **Framework:** React 18+ mit TypeScript (Vite)
- **Styling:** TailwindCSS (modernes, kindgerechtes Design mit Nunito/Quicksand Font)
- **Auth:** Firebase Authentication (Google OAuth 2.0)
- **Features:** Web Speech API für Sprachein- und ausgabe, HTML5 Canvas für LUMI Blast.

### Backend
- **Framework:** FastAPI (Python 3.12)
- **KI-Integration:** Google GenAI SDK (Gemini 2.0 Flash) – nutzt Vision für Bildanalyse.
- **Datenbank:** Hybrid-Setup (SQLite für lokale Entwicklung, PostgreSQL/Neon für Produktion).
- **Wissen:** Lehrplan-Kontext hinterlegt als Markdown-Dateien in `backend/knowledge/`.

## 🏗 Architektur & Konzepte
- **Kein RAG:** Statt komplexer Vektordatenbanken nutzt LUMI Gemini Vision zur direkten Analyse von Arbeitsblättern und lädt Lehrplan-Kontext direkt in den System-Prompt.
- **Meta-Prompts:** Aus den Wizard-Daten wird ein Profil erstellt, das bei jeder KI-Anfrage mitgesendet wird, um die Antworten perfekt auf den Schüler zuzuschneiden.
- **HotKey-Buttons:** Interaktive Buttons ("Verstanden", "Beispiel", etc.) steuern den Lernfluss ohne viel Tipparbeit.

## ⚙️ Setup & Entwicklung
### Lokal starten
1. **Backend:** 
   - `cd backend`
   - `pip install -r requirements.txt`
   - `.env` anlegen mit `GEMINI_API_KEY` und `FIREBASE_SERVICE_ACCOUNT_JSON` (oder `serviceAccountKey.json` bereitstellen).
   - `uvicorn main:app --reload` (Port 8000)
2. **Frontend:** 
   - `cd frontend`
   - `npm install`
   - `npm run dev` (Port 5173)

### Umgebungsvariablen
- **VITE_API_URL:** Zeigt im Frontend auf das Backend (lokal `http://localhost:8000`).
- **DATABASE_URL:** Für PostgreSQL in Produktion.
- **CORS_ORIGINS:** Erlaubte Domains für API-Zugriff.

## 🎓 Hintergrund
Dieses Projekt nutzt die 25x günstigeren API-Kosten von Google Gemini im Vergleich zu OpenAI und ermöglicht so eine leistungsstarke KI-Nachhilfe im Free-Tier. Entwickelt mit Fokus auf Clean Code, DSGVO-Konformität und pädagogischer Sinnhaftigkeit.

---
Developed with ❤️
