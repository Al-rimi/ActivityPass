# ActivityPass (活动通)

**AI-Assisted Student Activity Management Platform for Zhejiang Normal University (ZJNU)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![Django](https://img.shields.io/badge/Django-5.2+-092e20.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)

A comprehensive, bilingual (English/中文) platform that streamlines extracurricular activity management for students and staff at Zhejiang Normal University.

## Project Overview

ActivityPass revolutionizes how students discover, apply for, and participate in extracurricular activities while helping staff efficiently manage the entire process. The platform features AI-assisted eligibility checking, automated student provisioning, and comprehensive activity lifecycle management.

### Core Features

- **Smart Student Management**: Automatic student profile creation, eligibility verification, and participation tracking
- **Intelligent Scheduling**: Conflict detection with class timetables, capacity management, and deadline enforcement
- **Bilingual Interface**: Full English and Chinese language support with automatic detection
- **AI-Powered Eligibility**: Rule-based and AI-assisted qualification scoring and recommendations
- **Comprehensive Analytics**: Activity participation statistics, student engagement metrics, and reporting
- **Secure Authentication**: JWT-based authentication with role-based access control
- **Responsive Design**: Modern React interface with Tailwind CSS styling

## Architecture

### Tech Stack

| Component                | Technology                                       | Purpose                               |
| ------------------------ | ------------------------------------------------ | ------------------------------------- |
| **Backend**              | Python 3.11+, Django 5.2+, Django REST Framework | API, business logic, data management  |
| **Frontend**             | React 18+, TypeScript, Vite, Tailwind CSS        | User interface, responsive design     |
| **Database**             | MySQL 8.0+                                       | Data persistence, complex queries     |
| **Authentication**       | JWT, Django Auth                                 | Secure user sessions, role management |
| **Internationalization** | i18next, react-i18next                           | Bilingual content management          |
| **Maps**                 | AMap API, Leaflet                                | Location services, activity venues    |
| **Testing**              | pytest, Vitest, React Testing Library            | Quality assurance                     |

### Repository Structure

```
ActivityPass/
├── backend/                 # Django REST API
│   ├── ActivityPass/        # Django settings & configuration
│   ├── accounts/           # User management & authentication
│   ├── activities/         # Activity management & eligibility
│   ├── common/             # Shared utilities & helpers
│   └── requirements.txt    # Python dependencies
├── frontend/               # React TypeScript SPA
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── locales/        # Translation files
│   │   └── types/          # TypeScript definitions
│   └── package.json        # Node.js dependencies
├── reference/              # Legacy scripts (development only)
├── scripts/                # Utility scripts
├── run_all.py             # Cross-platform setup automation
├── .env.example           # Environment configuration template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Quick Start

### Prerequisites

- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend tooling
- **MySQL 8.0+** - Database server
- **Git** - Version control

### One-Command Setup (Recommended)

The project includes an intelligent setup script that handles everything automatically:

```bash
# Clone and setup everything
git clone https://github.com/Al-rimi/ActivityPass.git
cd ActivityPass
python run_all.py
```

The script will:

- Check for existing `.env` file or prompt for MySQL credentials
- Create Python virtual environment
- Install backend dependencies (shows package count)
- Setup database and run migrations (detailed output)
- Initialize application with sample data
- Install frontend dependencies
- Start both backend (port 8000) and frontend (port 3000) servers

### Manual Setup

If you prefer manual setup:

#### 1. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your MySQL credentials
# The setup script can do this for you if .env doesn't exist
```

#### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py init_app  # Creates admin user and seeds data (users, students, courses, and academic terms from course data)
python manage.py runserver
```

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```env
# Django Configuration
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=*

# Database Configuration
DB_ENGINE=mysql
DB_NAME=activitypass
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306

# CORS Configuration
CORS_ALLOW_ALL=true

# Frontend API Keys
VITE_AMAP_KEY=your_amap_api_key_here
```

### Database Setup

```sql
CREATE DATABASE activitypass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## API Documentation

### Authentication Endpoints

- `POST /api/token/` - Obtain JWT access/refresh tokens
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/token/verify/` - Verify token validity

### Student Endpoints

- `GET /api/students/profile/` - Get current student profile
- `PUT /api/students/profile/` - Update student profile
- `GET /api/students/activities/` - List student's activities
- `POST /api/students/activities/{id}/apply/` - Apply for activity

### Activity Endpoints

- `GET /api/activities/` - List all activities
- `GET /api/activities/{id}/` - Get activity details
- `POST /api/activities/` - Create new activity (staff only)
- `PUT /api/activities/{id}/` - Update activity (staff only)

### Admin Endpoints

- `POST /api/admin/create-staff/` - Create staff account
- `POST /api/admin/reset-password/` - Reset user password
- `GET /api/admin/students/` - List all students
- `GET /api/admin/activities/` - List all activities with stats

## Frontend Features

### User Interface

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Automatic theme switching
- **Bilingual Support**: English and Chinese with persistent language preference
- **Modern UI**: Clean, intuitive interface with Tailwind CSS

### Key Components

- **Authentication Flow**: Login, registration, password reset
- **Student Dashboard**: Activity browsing, application tracking, profile management
- **Staff Dashboard**: Activity creation, student management, analytics
- **Location Picker**: Interactive map for activity venues
- **Date/Time Picker**: User-friendly scheduling interface

### Internationalization

Translation files are located in `frontend/src/locales/`:

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t("welcome.title")}</h1>;
}
```

## Development

### Available Scripts

#### Backend

```bash
cd backend
python manage.py runserver          # Start development server
python manage.py test              # Run tests
python manage.py makemigrations    # Create database migrations
python manage.py migrate           # Apply migrations
python manage.py init_app          # Initialize with sample data
python manage.py seed_students     # Seed student data
```

#### Frontend

```bash
cd frontend
npm start         # Start development server
npm run build     # Build for production
npm test          # Run tests
npm run typecheck # TypeScript type checking
```

### Code Quality

- **Backend**: Follows PEP 8 style guide, uses Black for formatting
- **Frontend**: ESLint and Prettier for code quality
- **Testing**: pytest for backend, Vitest for frontend
- **Git Hooks**: Pre-commit hooks for quality checks

### Database Management

```bash
# Reset database (development only)
python manage.py flush
python manage.py migrate
python manage.py init_app
```

## Deployment

### Production Checklist

- [ ] Set `DJANGO_DEBUG=false` in environment
- [ ] Configure production database settings
- [ ] Set strong `DJANGO_SECRET_KEY`
- [ ] Configure allowed hosts and CORS settings
- [ ] Enable HTTPS and secure headers
- [ ] Setup static file serving (nginx/apache)
- [ ] Configure log rotation and monitoring
- [ ] Setup backup strategy for database

### Deploying Without Docker

- Use `scripts/sh/deploy.sh` for both bootstrap and updates (see `README_DEPLOYMENT.md`).
- Ensure the target host provides `python3`, `python3-venv`, `pip`, `git`, `npm`, and `sudo` before running the script.
- `./scripts/sh/deploy.sh bootstrap --domain yourdomain.com` creates/refreshes the virtualenv, installs dependencies, runs migrations and seed data, builds the frontend, and syncs assets into `/opt/1panel/apps/openresty/openresty/www/sites/yourdomain.com/index`.
- `./scripts/sh/deploy.sh update --domain yourdomain.com` pulls the latest code (when `PULL_FIRST=true`), refreshes the backend environment, rebuilds the frontend, and executes any `RESTART_COMMAND` you provide inline.
- Export overrides inline (e.g. `RUN_COLLECTSTATIC=true`, `WAIT_FOR_DB=true`, `RESTART_COMMAND="sudo systemctl restart activitypass"`) as needed for your environment.
- Hook your process manager (systemd, supervisor, etc.) to the virtualenv in `backend/.venv` and let the script restart it via `RESTART_COMMAND`.

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make** your changes with tests
4. **Run** tests: `python manage.py test` and `npm test`
5. **Commit** with clear messages: `git commit -m "Add: feature description"`
6. **Push** to your fork: `git push origin feature/your-feature`
7. **Create** a Pull Request

### Code Standards

- **Python**: PEP 8 compliant, type hints encouraged
- **TypeScript**: Strict mode, descriptive variable names
- **React**: Functional components with hooks
- **Git**: Conventional commit messages

### Testing

```bash
# Backend tests
cd backend
python manage.py test --verbosity=2

# Frontend tests
cd frontend
npm test -- --coverage
```

## Project Status

### Current Features

- [x] User authentication and authorization
- [x] Student profile management
- [x] Activity creation and management
- [x] Eligibility checking system
- [x] Bilingual user interface
- [x] Responsive design
- [x] Automated setup script
- [x] Database migrations and seeding
- [x] API documentation
- [x] Comprehensive testing

### Planned Features

- [ ] AI-powered recommendations
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Integration with university systems
- [ ] Advanced reporting features
- [ ] Real-time notifications

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Zhejiang Normal University** for the hackathon opportunity
- **Django Community** for the excellent web framework
- **React Community** for the powerful frontend library
- **Open Source Contributors** for the amazing tools and libraries

## Support

For questions or support:

- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Built for ZJNU Hackathon 2025-2026**
