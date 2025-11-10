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
