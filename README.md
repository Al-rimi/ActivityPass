# ActivityPass (活动通)

Unified bilingual student activity management platform.

## Overview

ActivityPass provides:

- Django REST backend (JWT auth, auto student provisioning, CSV seeding, bilingual content fields)
- React + TypeScript + Tailwind CSS frontend (English / 中文, dark mode, profile completion flow)
- Automatic student creation on first login when ID matches pattern and default password `000000`
- Management commands for init (`init_app`) and data seeding (`seed_students`)

## Repository Structure

```
backend/        Django project & apps
frontend/       React (CRA) TypeScript SPA
data/           Student CSV & sample timetable ICS
```

## Quick Start (Windows PowerShell)

Prerequisites: Python 3.11+, Node.js 18+, MySQL running & accessible.

### 1. Configure Backend Environment

Create `.env` in `backend/ActivityPass/` (example):

```
DJANGO_SECRET_KEY=change-me
DB_NAME=activitypass
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=127.0.0.1
DB_PORT=3306
TRANSLATE_API_URL=https://libretranslate.de/translate
# TRANSLATE_API_KEY=optional-key
```

Install dependencies & apply migrations:

```powershell
cd backend
python -m venv .venv
./.venv/Scripts/Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_students   # or: python manage.py init_app
```

Run development server:

```powershell
python manage.py runserver 0.0.0.0:8000
```

### 2. Frontend Setup

```powershell
cd frontend
npm install
npm start   # Dev server (proxy to backend)
```

Production build:

```powershell
npm run build
```

### 3. Single-Command Automation (Optional)

Use provided PowerShell script at repo root:

```powershell
./run_all.ps1
```

It will: create venv, install backend deps, migrate, seed students, start backend in a new window, install frontend deps, and start frontend dev server.

## Authentication Flow

1. Student enters 12‑digit ID + password `000000`.
2. Backend auto‑creates user + `StudentProfile` if ID valid & not existing.
3. User redirected to profile completion page if missing name.
4. JWT access/refresh issued from `/api/token/`.

## i18n Content

Activities store bilingual fields (`title_i18n`, `description_i18n`) with fallback logic. Translation helper (`backend/common/translation.py`) can populate English / Chinese using a LibreTranslate‑compatible endpoint.

## Key Management Commands

| Command | Purpose |
|---------|---------|
| `python manage.py seed_students --file data/cst.csv` | Bulk import student records |
| `python manage.py init_app` | Migrate + seed in one step |

## Frontend Conventions

- Tailwind utilities for styling; dark mode via `class` strategy.
- Translation keys live in `src/locales/en/` & `src/locales/zh/`.
- ProtectedRoute enforces auth + profile completion.

## Development Tips

- Use `python manage.py createsuperuser` for admin access.
- If seeding large CSV, performance optimized by skipping password rehash for existing users.
- Adjust MySQL connection/timeouts in `backend/ActivityPass/settings.py` if needed.

## Deployment Notes

- Collect static files if serving frontend separately or switch to a production build served by a static host.
- Configure MySQL and translation API endpoints via environment variables in production.
- Use a stronger password policy; current default `000000` is placeholder for controlled environments.

## License

See `LICENSE` (add if missing).

## Frontend README Summary

The frontend README covers stack (React, TS, Tailwind, i18n), scripts (`npm start`, `npm test`, `npm run build`, `npm run typecheck`), translation usage via `useTranslation`, Tailwind setup, proxy configuration to backend, auth flow, feature checklist, and future enhancements (token refresh, forms, recommendations, dark theme refinements).

## Running Migrations Recap

```powershell
cd backend
./.venv/Scripts/Activate.ps1
python manage.py migrate
python manage.py seed_students   # or init_app
```

## Seeding Performance

Seed script skips resetting passwords for existing users to avoid CPU cost of repeated hashing.

---
Generated README; update as architecture evolves.
# ActivityPass

AI-assisted student activity management platform for Zhejiang Normal University (ZJNU).

## Overview

ActivityPass streamlines how college staff publish extracurricular activities and how students discover and join them. It applies rule-based eligibility checks (schedule conflicts, major/college match, participation limits, language level) and will progressively integrate AI models for smarter qualification scoring and personalization.

## Core Goals (Phase 1)

1. Unified backend (Django) providing REST API endpoints for activities, users, participation, and timetable ingestion.
2. React frontend for staff dashboards and student browsing/applications.
3. Parsing utility (legacy scripts in `reference/`) to extract timetable/course data from PDFs and generate iCalendar (.ics) feeds.
4. Basic rules:
   - Max 7 activities per student per academic year (2 guaranteed core + up to 5 additional elective slots).
   - No overlap with class schedule (time conflict check).
   - Respect major/college restrictions.
   - Optional Chinese language proficiency level gating.
   - Reduced prioritization if already holding required baseline (e.g., after 2 core activities).

## Planned AI Integration (Future Phases)

| Phase | Capability                                                                  |
| ----- | --------------------------------------------------------------------------- |
| 2     | NLP-based extraction from new timetable formats, improved PDF/HTML parsing. |
| 3     | Student fit scoring model (history, performance, interests).                |
| 4     | Recommendation engine & load balancing for fair distribution.               |
| 5     | Predictive attendance and dynamic capacity adjustment.                      |

## Tech Stack

| Layer    | Technology                                                             |
| -------- | ---------------------------------------------------------------------- |
| Backend  | Python 3, Django, Django REST Framework                                |
| Frontend | React (Create React App scaffold)                                      |
| Data     | PostgreSQL (planned), SQLite (dev), Redis (caching sessions - planned) |
| AI       | Transformers / Open-source LLMs (future), rule engine (initial)        |

## Repository Structure

```
backend/        # Django project (ActivityPass settings & apps)
frontend/       # React frontend (public + src)
reference/      # Legacy timetable parsing scripts (ignored by .gitignore for prod)
README.md       # Project documentation
LICENSE         # MIT License
.gitignore      # Ignore patterns
```

## Getting Started

### Prerequisites

- Python 3.11+ (recommended)
- Node.js 18+ and npm
- (Future) PostgreSQL service for production

### Backend Setup

```pwsh
cd backend
python -m venv .venv
\.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a MySQL database and set environment variables:

```pwsh
# In MySQL shell
# CREATE DATABASE activitypass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# In repo root, create .env from template
cd ..
Copy-Item .env.example .env -Force
# .env is already set to DB_PASSWORD=000000 for local dev; adjust if needed
```

Run migrations and start server:

```pwsh
cd backend
python manage.py migrate
python manage.py runserver
```

Server runs at http://127.0.0.1:8000/

### Frontend Setup

```pwsh
cd frontend
npm install
npm start
```

App runs at http://localhost:3000/

### Fullstack Development Convenience

Run both Django API and React dev server (requires Node/npm installed and on PATH):

```pwsh
cd backend
python manage.py runfullstack
```

Build React and serve via Django only (production-like single port):

```pwsh
cd backend
python manage.py runfullstack --build
```

### Seeding Demo Data

Create a staff user and sample activities:

```pwsh
cd backend
python manage.py seed_demo
```

### Node.js on Windows

Download installer from https://nodejs.org/en/download and reopen PowerShell so `npm` is available. Verify:

```pwsh
npm --version
```

## Next Steps

- Define Django apps: users, activities, eligibility, timetable.
- Implement timetable upload endpoint; integrate parsing logic adapted from `reference/`.
- Introduce authentication (Django auth + JWT for SPA usage).
- Draft eligibility service (class conflict, count cap, major filter, language requirement).
- Add testing (pytest + React Testing Library) & CI workflow.

## Environment Variables

See `.env.example` for supported keys. A local `.env` is already created for you and is git-ignored.

## AI Integration

- A lightweight recommendation helper is available in `backend/ai/recommendation.py`.
- It optionally uses `sentence-transformers` (MiniLM) to embed activity titles and find similar content. If not installed, it falls back to a simple keyword overlap method.
- To enable embeddings:
  ```pwsh
  pip install sentence-transformers
  ```
  (Optional, not required for basic functionality.)

## Contributing

Contributions are welcome! Please open an issue describing the enhancement or bug. Ensure code follows PEP8 (backend) and ESLint (frontend) standards. Include tests for new logic.

## License

MIT © 2025 ActivityPass contributors

## Acknowledgments

- ZJNU Hackathon organizing committee.
- Open-source community (Django, React, Testing Library).
