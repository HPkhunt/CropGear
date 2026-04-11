# Runtime Services and Deployment Ownership

This guide clarifies which supporting services CropGear actually needs in local development, which ones become production dependencies, and which product areas "own" each dependency.

## Quick Matrix

| Service | Local requirement | Production-style requirement | Owned by / used by | Notes |
| --- | --- | --- | --- | --- |
| MongoDB | Required | Required | Core application runtime | Primary persistence for auth, users, equipment, bookings, reviews, chat, and admin data. |
| Redis | Optional | Required only if you deploy worker-backed async jobs | Celery broker/result backend | The current cache service is in-memory for the hot path, so the API can boot without Redis. |
| Celery worker | Optional | Required only for shipped background jobs | Media optimization pipeline | Used when uploaded media triggers async variant generation. |
| Stripe | Optional | Required only when payments are enabled | Payment checkout/history flows | `/api/v1/payments/config` exposes whether checkout should be enabled. |
| S3-compatible storage | Optional | Required only when media uploads are enabled | Media upload and asset handling | The media capability endpoint checks actual bucket readiness. |
| SMTP | Optional | Required only when email workflows are enabled | Password reset and transactional email | Email flags exist for password reset plus booking/payment/admin notifications. |
| Google Maps API | Optional | Optional, but required for richer map/geocoding experiences | Nearby/location-aware search | Location search can be feature-flagged and tested separately. |
| Demo seed data | Recommended on fresh local DBs | Disabled | Local onboarding/demo environments | Keep `ENABLE_DEMO_SEED=False` in production-style deployments. |

## What the Current Codebase Assumes

### MongoDB

- Required for the normal application runtime.
- The app connects through `backend/app/db/client.py`.
- Most API routes are database-backed and will not behave correctly without MongoDB.

### Redis and Celery

- `docker-compose.yml` starts Redis and a Celery worker because that is the easiest full-stack local profile.
- `backend/app/core/celery_app.py` defaults Celery broker/result URLs to Redis.
- `backend/app/services/cache_service.py` is no longer Redis-backed for core request handling, so auth/session correctness does not depend on Redis being present.
- If you are not testing async workflows, you can run the API and frontend without Redis/Celery.

### Stripe

- Payments are opt-in through `STRIPE_ENABLED` plus real Stripe keys.
- The backend exposes payment capability status through `/api/v1/payments/config`.
- Without Stripe configuration, checkout should be treated as intentionally unavailable rather than broken.

### S3-compatible media storage

- Media upload APIs depend on valid storage credentials and a reachable bucket.
- Upload capability is surfaced via the media capability endpoint.
- Async post-processing is best-effort unless Redis/Celery are also available.

### SMTP

- SMTP is only required for real email sending.
- Password reset, booking, payment, and admin notification flows rely on mail credentials when their feature flags are enabled.
- Local development can leave mail disabled unless those paths are under test.

### Google Maps / location features

- Location-aware browsing is feature-flagged.
- A Google Maps key is only necessary when you need the richer geocoding/map-assisted path.
- Treat this as an optional integration, not a blocker for baseline local development.

## Recommended Local Profiles

### 1. Core product development

Use this when working on most backend/frontend flows:

- MongoDB running
- Backend API
- Vite frontend
- `ENABLE_DEMO_SEED=True` on a fresh local database if you want demo inventory
- `USE_MOCK_DB=False` unless you intentionally want a disposable in-memory backend

Redis, Celery, Stripe, S3, SMTP, and Google Maps are optional in this profile.

### 2. Full integration validation

Use this when testing uploads, payments, or background jobs:

- MongoDB
- Redis
- Celery worker
- Real or sandbox credentials for the provider under test

This is the closest match to `docker-compose.yml`.

### 3. Production-style smoke testing

Use this before deployment-oriented validation:

- Real MongoDB
- Strong `SECRET_KEY`
- `ENABLE_DEMO_SEED=False`
- `USE_MOCK_DB=False`
- Only enable Stripe/S3/SMTP/Google Maps if the target deployment will actually use them
- Redis + Celery only if you are deploying the background-job pipeline

## Ownership Rules

Treat each service as owned by the feature that cannot fulfill its contract without it:

- MongoDB is a platform-level hard dependency.
- Redis and Celery are owned by async/background workflows, not by the baseline API.
- Stripe is owned by payment checkout and payment history/receipt expectations.
- S3-compatible storage is owned by listing media uploads and post-processing.
- SMTP is owned by password reset and transactional notifications.
- Google Maps is owned by location search enhancements.

This distinction matters because local setup, CI, and deployment docs should only require a service when its owning feature is in scope.

## Source of Truth Files

- `backend/app/config.py`
- `backend/app/core/celery_app.py`
- `backend/app/services/cache_service.py`
- `backend/app/api/v1/endpoints/payments.py`
- `backend/app/api/v1/endpoints/media.py`
- `backend/app/utils/email.py`
- `docker-compose.yml`
- `docs/demo-data.md`
