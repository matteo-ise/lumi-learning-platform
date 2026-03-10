# LUMI – KI-Lernplattform

KI-gestuetzte Nachhilfeplattform fuer Schueler (Klassen 1–4) mit personalisiertem Tutoring, Bilderkennung und Gamification.

## Tech-Stack

| Was              | Technologie                |
| ---------------- | -------------------------- |
| Frontend         | React (Vite) + TailwindCSS |
| Backend          | FastAPI (Python)            |
| LLM + Vision     | Google Gemini 2.5 Flash     |
| Datenbank        | SQLite                      |

## Quickstart

```bash
# Backend starten
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend starten (neues Terminal)
cd frontend
npm install
npm run dev
```

| Service    | URL                       |
| ---------- | ------------------------- |
| Frontend   | http://localhost:5173      |
| Backend    | http://localhost:8000      |
| API-Docs   | http://localhost:8000/docs |

## Dokumentation

- [Projekt 1: Homepage & Landing Page](docs/01-homepage-landing.md)
- [Projekt 2: KI-Chat mit Bilderkennung](docs/02-ki-chat.md)
- [Umsetzungsplan: Sprint-by-Sprint](docs/03-umsetzung.md)

## Repo-Struktur

```
uni-lumi-ki-lernplattform/
├── docs/                  Technische Konzeptdokumente
├── frontend/              React SPA
├── backend/               FastAPI + Gemini
│   ├── main.py            Gesamtes Backend in einer Datei
│   ├── knowledge/         Lehrplan-Kontext (.md)
│   └── requirements.txt
└── README.md
```
