<p align="center">
  <h1 align="center">🌾 CropGear</h1>
  <p align="center">Smart Agricultural Equipment Rental Platform</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-008CDD?style=flat&logo=stripe&logoColor=white" />
</p>

---

## Overview

CropGear connects **farmers** who need agricultural equipment with **equipment owners** who want to rent out their machinery. The platform provides equipment browsing, booking management, secure payments, real-time chat, reviews, and admin oversight.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, React Router 6 |
| **Backend** | Python 3.12+, FastAPI, Uvicorn |
| **Database** | MongoDB (Motor async driver) |
| **Payments** | Stripe |
| **Media** | AWS S3 (presigned uploads) |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Real-time** | WebSocket (notifications + chat) |

## Project Structure

```
cropgear/
├── backend/               ← FastAPI REST API
│   ├── app/
│   │   ├── api/v1/        ← Versioned API endpoints
│   │   ├── core/          ← Security, config, constants
│   │   ├── db/            ← MongoDB client & repositories
│   │   ├── middleware/    ← Rate limiting, security headers
│   │   ├── models/        ← Pydantic schemas
│   │   ├── services/      ← Business logic services
│   │   └── utils/         ← Email, validators, helpers
│   ├── .env.example       ← Environment template
│   └── requirements.txt   ← Python dependencies
│
├── frontend/              ← React SPA
│   ├── src/
│   │   ├── components/    ← Reusable UI components
│   │   ├── pages/         ← Route pages
│   │   ├── context/       ← React contexts (Auth, Theme, etc.)
│   │   ├── services/      ← API client modules
│   │   └── utils/         ← Frontend helpers
│   ├── package.json
│   └── vite.config.mjs
│
├── docs/                  ← Project documentation
├── docker-compose.yml     ← MongoDB container
└── README.md
```

## Quick Start

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **MongoDB** (local or [Docker](#docker))

### 1. Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Start dev server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Open the app

- **Frontend:** http://localhost:5173
- **Backend API:** http://127.0.0.1:8000
- **API Docs:** http://127.0.0.1:8000/docs
- **Health Check:** http://127.0.0.1:8000/health

### Docker

Spin up MongoDB with one command:

```bash
docker-compose up -d
```

## User Roles

| Role | Access |
|------|--------|
| **Farmer** | Browse equipment, book, pay, review |
| **Equipment Owner** | List equipment, manage bookings, view earnings |
| **Admin** | Dashboard, user approval, content moderation |

## API Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/v1/auth` | Login, register, password reset |
| Users | `/api/v1/users` | Profile management |
| Equipment | `/api/v1/equipment` | CRUD, search, browse |
| Bookings | `/api/v1/bookings` | Create, approve, reject |
| Payments | `/api/v1/payments` | Stripe intents, webhooks |
| Reviews | `/api/v1/reviews` | Submit, respond, moderate |
| Chat | `/api/v1/chat` | Messaging, WebSocket |
| Media | `/api/v1/media` | S3 presigned uploads |
| Admin | `/api/v1/admin` | Dashboard, approvals |

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description |
|----------|-------------|
| `MONGODB_URL` | MongoDB connection string |
| `SECRET_KEY` | JWT signing key (min 32 chars for production) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP credentials |
| `AWS_ACCESS_KEY_ID` | S3 media storage |

See `backend/.env.example` for the full list.

## License

This project is for educational and portfolio purposes.
