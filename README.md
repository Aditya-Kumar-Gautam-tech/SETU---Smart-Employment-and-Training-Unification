# SETU - Smart Employment and Training Unification

SETU is a full-stack employability platform that connects resume understanding, verified skill extraction, AI-assisted guidance, and job discovery into one workflow.

Instead of making users manually search job portals with loose keywords, SETU starts from the user's resume, extracts skills, lets the user confirm them, and then uses those verified skills to drive personalized job discovery and recommendation features.

## Core Features

- Secure authentication using email/password and Google OAuth
- Resume upload and parsing pipeline for PDF resumes
- Skill extraction with user confirmation before matching
- Backend-driven job discovery using verified skills
- `skills_rag` role-based recommendation engine for resume guidance
- `hover_rag` AI coach for job-card-specific insights on the openings page
- Modern React frontend with a product-style UI experience

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion

### Backend

- Python
- Django
- Django REST Framework
- JWT authentication
- Google OAuth integration

### Data and Services

- PostgreSQL
- Adzuna API for job discovery
- OpenRouter-compatible / LLM-based recommendation support

## Project Structure

```text
SETU---Smart-Employment-and-Training-Unification/
├── backend/
│   └── config/
│       ├── auth_service/
│       ├── resumes/
│       ├── discovery/
│       ├── parsing/
│       ├── skills_rag/
│       ├── hover_rag/
│       ├── config/
│       └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/
│   └── package.json
└── README.md
```

## Main Workflow

1. The user signs up or logs in.
2. The user uploads a resume in PDF format.
3. The backend parses the resume and extracts skills.
4. The extracted skills are shown back to the user for confirmation.
5. The verified skills are stored and used for job discovery.
6. The frontend displays ranked job matches.
7. Additional AI layers provide role-based and job-specific resume guidance.

## Backend Modules

### `auth_service`

Handles:

- signup
- login
- Google OAuth
- current authenticated user retrieval
- JWT-protected access

### `resumes`

Handles:

- resume upload
- parsed resume storage
- extracted skills retrieval
- verified skills persistence

### `discovery`

Handles:

- job discovery endpoint
- role recommendation endpoint
- integration with the job scraper and recommendation services

### `parsing`

Handles:

- advanced resume parsing logic
- extraction pipeline for resume content

### `skills_rag`

Handles:

- role guidance retrieval
- missing skill analysis
- ATS keyword suggestions
- resume improvement recommendations

### `hover_rag`

Handles:

- hover-based AI insights on job cards
- resume chunk retrieval
- job-specific match explanations
- fallback deterministic insight generation

## Frontend Overview

The frontend is built as a React application with page-based routing and reusable UI components.

Main pages include:

- Home
- Auth
- Openings
- Apply
- Not Found

The Openings page is the central working surface of the project. It supports:

- resume upload
- skill confirmation
- job search based on verified skills
- hover-based AI coaching

## Local Setup

## 1. Clone the repository

```bash
git clone https://github.com/Aditya-Kumar-Gautam-tech/SETU---Smart-Employment-and-Training-Unification.git
cd SETU---Smart-Employment-and-Training-Unification
```

## 2. Backend setup

```bash
cd backend/config
python -m venv ..\\venv
..\\venv\\Scripts\\activate
pip install -r ..\\config\\parser\\requirements.txt
python manage.py migrate
python manage.py runserver
```

Note:

- The repository excludes the local `.env` file from version control.
- You must create your own `backend/config/.env`.

Example backend `.env` values:

```env
GOOGLE_OAUTH_CLIENT_IDS=your_google_client_id
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
ADZUNA_COUNTRY=in
ADZUNA_RESULTS_TO_FETCH=20
SKILLS_RAG_API_KEY=
SKILLS_RAG_MODEL=
SKILLS_RAG_BASE_URL=
SKILLS_RAG_TIMEOUT=20
OPENROUTER_API_KEY=
APP_URL=http://localhost:8000
OR_MODEL=mistralai/mistral-7b-instruct:free
```

Also configure PostgreSQL in:

- `backend/config/config/settings.py`

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env` locally:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 4. Default local execution topology

- Frontend runs through Vite on a local development port such as `localhost:5173`
- Backend runs through Django on `127.0.0.1:8000`
- PostgreSQL runs on port `5432`
- Frontend and backend communicate via REST APIs

## Current Project Status

The project currently includes:

- working frontend-backend integration
- JWT and Google OAuth authentication
- resume upload and parsing workflow
- verified skill confirmation flow
- backend job discovery endpoint
- `skills_rag` and `hover_rag` AI guidance layers

Known integration note:

- live job discovery depends on valid Adzuna credentials and external API access

## Notes for Submission / Academic Use

This repository was developed as a capstone-style academic project focused on:

- full-stack system design
- API integration
- resume intelligence
- employability assistance
- recommendation workflows
- RAG-based AI guidance

## License

This repository currently includes the license file present at the project root.
