# CropGear

CropGear is a full-stack equipment rental platform for farmers, equipment owners, and admins. The repository contains a FastAPI backend, a React + Vite frontend, MongoDB-backed persistence, JWT auth with refresh tokens, booking and payment flows, media upload support, and real-time notifications over WebSockets.

## Stack

- Backend: FastAPI, Motor/PyMongo, Pydantic Settings, Passlib, python-jose
- Frontend: React 18, React Router, Vite, Axios, Lucide, Stripe Elements
- Database: MongoDB
- Realtime: WebSocket notifications at `/ws/notifications`
- Payments: Stripe
- Media: S3-style presign/finalize flow

## Repository Layout

```text
CropGear/
|- backend/
|  |- app/
|  |  |- api/v1/endpoints/   # auth, equipment, bookings, payments, chat, reviews, media, admin
|  |  |- core/               # security, password policy, exceptions
|  |  |- db/                 # Mongo client, repositories, demo seed data
|  |  |- services/           # cache, media, notifications
|  |  `- main.py             # FastAPI entrypoint
|  |- Dockerfile
|  |- requirements.txt
|  `- .env.example
|- frontend/
|  |- src/
|  |  |- pages/              # farmer, owner, admin, auth pages
|  |  |- components/
|  |  |- services/           # API clients
|  |  `- routes/AppRoutes.jsx
|  |- package.json
|  `- vite.config.mjs
|- docs/
|  |- TODO.md
|  |- demo-data.md
|  |- runtime-services.md
|  `- ui-ux-roadmap.md
|- .github/workflows/ci.yml  # GitHub Actions pipeline
|- .dockerignore
|- docker-compose.yml        # MongoDB + Redis + backend + worker (+ optional frontend)
|- package.json             # repo-level quality scripts
|- run_integrated.sh         # macOS/Linux wrapper for the dev launcher
|- run_integrated.ps1        # Windows helper to start backend + frontend
`- scripts/dev.mjs           # cross-platform integrated dev launcher
```

## Architecture Overview

### Backend

- `backend/app/main.py` starts FastAPI, configures middleware, mounts `/api/v1`, exposes `/health`, and serves the built frontend from `frontend/dist` when available.
- `backend/app/api/v1/router.py` wires the main API areas:
  - `/auth`
  - `/users`
  - `/equipment`
  - `/bookings`
  - `/payments`
  - `/chat`
  - `/reviews`
  - `/media`
  - `/admin`
- MongoDB connection and index setup live in `backend/app/db/client.py`.
- Demo data is auto-seeded on startup when `ENABLE_DEMO_SEED=True`.
- Auth uses access tokens plus refresh tokens, with session persistence and token revocation backed by Mongo.

### Frontend

- `frontend/src/routes/AppRoutes.jsx` defines public, farmer, owner, and admin routes.
- Vite proxies `/api`, `/uploads`, and `/ws` to the backend in local development.
- The frontend talks to the backend through Axios clients in `frontend/src/services`.
- If you run `npm run build`, the backend can serve the SPA directly from `frontend/dist`.

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+
- MongoDB 6+ locally, or Docker Desktop for `docker-compose`

### Service modes at a glance

CropGear can run in a lighter local mode than the full Docker stack suggests. The backend itself does not currently require Redis for auth/session correctness because `backend/app/services/cache_service.py` uses an in-memory cache and only persists auth session state to Mongo when available.

| Service | Local development | Production-style deployment | Notes |
| --- | --- | --- | --- |
| MongoDB | Required | Required | Primary application database for auth, users, equipment, bookings, chat, reviews, and admin data. |
| Redis | Optional | Required only if you deploy worker-backed async jobs | `docker-compose.yml` starts Redis because Celery uses it as broker/result backend. The core API can still boot without it. |
| Celery worker | Optional | Required only for async/background workflows you actually ship | Today this mainly powers background media optimization after upload finalization. |
| Stripe | Optional | Required only when payments are enabled | `/api/v1/payments/config` gates checkout/history UI and backend payment actions. |
| S3-compatible storage | Optional | Required only when media uploads are enabled | Media endpoints expose capability checks and presign/finalize flows. |
| SMTP | Optional | Required only when email notifications/reset flows are enabled | Needed for real password reset and booking/payment/admin emails. |
| Google Maps key | Optional | Optional, but needed for richer location search/geocoding | Nearby-search UX can exist without always requiring every map integration locally. |

For a fuller ownership matrix and recommended local vs production profiles, see [docs/runtime-services.md](docs/runtime-services.md).

If you intentionally want a disposable in-memory database for isolated local checks, set `USE_MOCK_DB=True`. It is explicit opt-in now and should remain `False` for normal development and all production-style environments.

### 1. Start local services

Option A: Docker Compose app stack

```powershell
docker compose up -d
```

This starts:

- MongoDB
- Redis
- FastAPI backend at `http://127.0.0.1:8000`
- Celery worker for media optimization tasks

This is the easiest "full feature" local profile, but it is not the only supported one. If you only need the core API and frontend, MongoDB is the only always-on dependency.

To also run the Vite frontend inside Docker:

```powershell
docker compose --profile frontend up -d
```

Option B: Docker database/cache only

```powershell
docker compose up -d mongo redis
```

Option C: your own local MongoDB / Redis instance

Use whatever local/hosted services you prefer, then point `MONGODB_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND` at them.

### 2. Configure backend environment

From the repo root:

```powershell
Copy-Item backend/.env.example backend/.env
```

Then review `backend/.env` against `backend/app/config.py`. `backend/.env.example` is kept aligned with the current settings model, and CI now checks for drift, but `config.py` is still the source of truth.

### 3. Install backend dependencies

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```powershell
cd ..\frontend
npm install
```

## Running the App

### Option A: start both servers with the cross-platform launcher

From the repo root:

```powershell
npm run dev
```

This starts:

- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`

On macOS/Linux you can also use:

```bash
./run_integrated.sh
```

The launcher uses `python` on Windows and tries `python3` then `python` on macOS/Linux. Set `PYTHON=/path/to/python` if you need to override that.

### Option B: use the Windows helper

```powershell
.\run_integrated.ps1
```

### Option C: run backend and frontend separately

Backend:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

If `--reload` is unstable on Windows in your environment, run the same command without `--reload`.

Frontend:

```powershell
cd frontend
npm run dev
```

### Option D: build frontend and let FastAPI serve it

```powershell
cd frontend
npm run build
cd ..\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

After the build exists, the backend serves the SPA at `/`.

### Option E: run the backend stack in Docker

```powershell
docker compose up -d
```

```powershell
docker compose --profile frontend up -d
```

Without the `frontend` profile, the backend stack runs in Docker and you can still use `npm run dev` locally for the UI.

## Common Commands

### Repo Root

```powershell
npm run dev
```

```powershell
npm run dev -- --dry-run
```

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

```powershell
npm run lint
```

```powershell
npm run docs:check
```

```powershell
docker compose up -d
```

```powershell
docker compose logs -f backend worker
```

```powershell
npm run format:check
```

```powershell
npm run format
```

GitHub Actions runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on pushes and pull requests. It checks backend import/lint/type/format/tests and frontend lint/tests/build in parallel.

### Backend

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

```powershell
cd backend
python -m pytest
```

```powershell
npm run typecheck:backend
```

### Frontend

```powershell
cd frontend
npm run dev
```

```powershell
cd frontend
npm run build
```

```powershell
cd frontend
npm run test:run
```

```powershell
cd frontend
npm run preview
```

## Demo Credentials

When `ENABLE_DEMO_SEED=True`, startup seeds demo users, equipment, and testimonials if the MongoDB database is empty.

For the full explanation of startup seeding, manual seed scripts, local-vs-production behavior, and the `mongomock_motor` caveat, see [docs/demo-data.md](docs/demo-data.md).

Default demo accounts from `backend/app/db/demo_credentials.json`:

| Role | Email | Password |
| --- | --- | --- |
| Farmer | `farmer@cropgear.com` | `Demo@123` |
| Equipment Owner | `owner@cropgear.com` | `Demo@123` |
| Equipment Owner | `owner2@cropgear.com` | `Demo@123` |
| Equipment Owner | `owner3@cropgear.com` | `Demo@123` |
| Equipment Owner | `owner4@cropgear.com` | `Demo@123` |
| Admin | `admin@cropgear.com` | `Demo@123` |

Demo users are seeded as:

- `is_active=True`
- `is_verified=True`
- `approval_status="approved"`

## Environment Variables

These are the most important settings currently wired through `backend/app/config.py`:

### Core app

- `ENVIRONMENT`
- `DEBUG`
- `HOST`
- `PORT`
- `APP_NAME`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`

### Database

- `MONGODB_URL`
- `DATABASE_NAME`
- `USE_MOCK_DB`

### Frontend / CORS

- `FRONTEND_BASE_URL`
- `ALLOWED_ORIGINS`
- `ALLOWED_ORIGIN_REGEX`
- `ALLOWED_HOSTS`

### Email

- `SMTP_SERVER`
- `SMTP_PORT`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`
- `ENABLE_PASSWORD_RESET_EMAIL`
- `ENABLE_BOOKING_CONFIRMATION_EMAIL`
- `ENABLE_BOOKING_REQUEST_EMAIL`
- `ENABLE_BOOKING_STATUS_EMAIL`
- `ENABLE_PAYMENT_RECEIPT_EMAIL`
- `ENABLE_ADMIN_APPROVAL_EMAIL`
- `ENABLE_OWNER_VERIFICATION_EMAIL`

### Payments

- `STRIPE_ENABLED`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Media / storage

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`

### Search / infra / feature flags

- `GOOGLE_MAPS_API_KEY`
- `ENABLE_LOCATION_SEARCH`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `ENABLE_DEMO_SEED`

### Frontend dev-only variables

The frontend uses Vite env vars in `frontend/vite.config.mjs`:

- `VITE_DEV_API_TARGET` default `http://127.0.0.1:8000`
- `VITE_DEV_PORT` default `5173`
- `VITE_PORT`
- `VITE_BASE_PATH`
- `VITE_API_BASE` optional override for Axios base URL

## Ports

| Service | Default |
| --- | --- |
| Frontend dev server | `5173` |
| Backend API | `8000` |
| Swagger docs | `8000/docs` |
| MongoDB | `27017` |

## What Works Today

- JWT login with refresh-token rotation and logout/session invalidation
- Role-based routing for farmer, owner, and admin users
- Demo-seeded marketplace inventory
- Equipment browsing, listing detail pages, nearby search, and saved-search presets/history
- Favorites sync between local shortlist state and `/users/me/favorites`
- Equipment comparison board
- Booking requests with pricing preview plus approve/reject/cancel/start/complete lifecycle management
- Stripe checkout and payment history with backend capability gating
- Review center flows for farmers, owner analytics/replies, and admin moderation
- Chat workspace with WebSocket delivery, archive/search, reactions, edit/delete, and mute controls
- Profile settings and password change flows
- Media capability checks plus S3-style presign/finalize APIs
- Admin approval queue plus admin equipment/reporting/newsletter/testimonial surfaces

## Known Limitations

- Automated tests now cover core backend auth/booking flows and frontend booking/password behavior, but broader page and integration coverage is still missing.
- Backend type checking is intentionally scoped to a stable core slice today; wider mypy coverage should expand over time.
- `docker-compose.yml` covers MongoDB, Redis, the backend API, and a Celery worker, but external services such as S3, SMTP, and Stripe still rely on real credentials or separate local tooling.
- Wider frontend consistency work is still needed around layout rhythm, loading/error states, accessibility, and responsive polish across dashboards and detail pages.
- Async media optimization depends on Redis + Celery when that workflow is enabled, even though the core API can run without them.
- Demo-oriented helpers still coexist with production-style runtime code; see [docs/demo-data.md](docs/demo-data.md) for the current boundaries.

## Troubleshooting

### Backend says database is unavailable

- Make sure MongoDB is running on the URL in `MONGODB_URL`.
- Check `http://127.0.0.1:8000/health`.
- The API returns `503` for database-backed routes if Mongo is not reachable.

### Frontend cannot reach the API in development

- Ensure the backend is running on `http://127.0.0.1:8000`.
- Vite proxies `/api`, `/uploads`, and `/ws` to the backend by default.
- If your backend runs elsewhere, set `VITE_DEV_API_TARGET`.

### Password reset or OTP email fails

- Configure `EMAIL_USER` and `EMAIL_PASSWORD`.
- Verify `SMTP_SERVER` and `SMTP_PORT`.
- Gmail usually requires an app password rather than your normal login password.

### Payments are unavailable

- Set `STRIPE_ENABLED=True`.
- Provide `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`.
- Checkout is disabled in the UI when Stripe is not configured.

### Media uploads are unavailable

- Configure AWS credentials and `S3_BUCKET_NAME`.
- The media capability endpoint checks real bucket readiness, not just env presence.

### Weak `SECRET_KEY` warning on startup

- Local development allows a weak/default key and logs a warning.
- Production should use a strong random `SECRET_KEY` with at least 32 characters.

## Recommended Next Work

The main implementation tracker lives in [docs/TODO.md](docs/TODO.md). The remaining high-value work has shifted away from missing backend feature surfaces and toward three areas:

- expand automated coverage around reviews, payments, favorites sync, nearby search, and profile settings
- tighten runtime validation for optional integrations you plan to ship in production
- standardize the frontend design system and UI/UX polish backlog in [docs/ui-ux-roadmap.md](docs/ui-ux-roadmap.md)
