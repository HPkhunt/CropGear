# Demo And Seed Data Guide

This guide explains how demo data enters CropGear, which files are responsible for it, and how local development behavior differs from a production-style deployment.

## Short Version

- The main FastAPI app uses `backend/app/db/client.py` and `backend/app/db/seed.py`.
- On startup, the backend connects to MongoDB, creates indexes, and optionally seeds demo users, equipment, and testimonials.
- `ENABLE_DEMO_SEED=True` controls the normal startup seed path.
- `backend/app/db/mock_data.py` is a standalone in-memory helper and is not the primary runtime data path for the current FastAPI app.
- `seed_equipment.py` and `seed_users_bookings.py` are manual scripts for scratch/demo data, not part of normal boot.

## Runtime Data Modes

### 1. Normal application mode

This is the path the FastAPI app uses in day-to-day development and production-style runs.

Boot sequence:

1. `backend/app/main.py` starts the app and calls `connect_db()`.
2. `backend/app/db/client.py` opens the database client.
3. Indexes are created with `ensure_indexes(...)`.
4. `seed_demo_data(...)` from `backend/app/db/seed.py` runs if `ENABLE_DEMO_SEED=True`.

In this mode, your source of truth is MongoDB.

### 2. In-memory mock Mongo mode

`backend/app/db/client.py` can use `mongomock_motor`, but only when `USE_MOCK_DB=True`.

That means:

- If `USE_MOCK_DB=True` and `mongomock_motor` is installed in the Python environment, the backend will use an in-memory mock Mongo client.
- This is useful for quick local verification and isolated checks.
- It is not a production configuration.
- Data will not behave like a normal persistent MongoDB deployment.

Recommended practice:

- Use a real MongoDB instance for regular local development.
- Leave `USE_MOCK_DB=False` for regular local development.
- Do not install `mongomock_motor` in production-style environments.

### 3. Legacy standalone mock database helper

`backend/app/db/mock_data.py` contains a `MockDatabase` class with seeded users, equipment, newsletters, testimonials, and a small runtime JSON persistence helper for owner-created equipment.

Important note:

- The current FastAPI startup path does not wire `mock_db` from `mock_data.py` into the live API.
- Treat it as legacy/demo helper code and shared seed constants, not as the active backend store.

## What Startup Seeding Actually Creates

The normal seed path lives in `backend/app/db/seed.py`.

When `ENABLE_DEMO_SEED=True` and the target collections are empty, it creates:

- Demo users from `backend/app/db/demo_credentials.json`
- Demo equipment inventory, roughly 60 listings, when owner users exist and `equipment` is empty
- Two testimonials when `testimonials` is empty

It does not automatically seed:

- Demo bookings
- Demo payments
- Demo reviews
- Demo chat conversations

## File Roles

### `backend/app/db/demo_credentials.json`

Defines the default demo accounts used by the standard startup seed:

- farmer
- equipment_owner
- admin

Passwords from this file are hashed during seed insertion.

### `backend/app/db/seed.py`

This is the primary startup seed path used by the live FastAPI app.

Responsibilities:

- Read demo credentials
- Create approved/verified demo users
- Create seeded equipment data
- Seed testimonials

It is intentionally conservative:

- Users are only seeded when `users` is empty
- Equipment is only seeded when `equipment` is empty
- Testimonials are only seeded when `testimonials` is empty

### `backend/app/db/mock_data.py`

This file contains:

- Shared seed constants used by some helper scripts
- A `MockDatabase` class with in-memory demo data
- A `runtime_equipment.json` persistence helper for non-seed equipment in that mock path

It is useful for isolated mock workflows and older demo-style flows, but it is not the main application database path.

### `backend/app/db/seed_equipment.py`

Manual helper script to seed equipment documents into MongoDB.

Use this only when you intentionally want to create a scratch dataset outside the normal startup seed.

### `backend/app/db/seed_users_bookings.py`

Manual helper script to insert fixed users and many random completed/confirmed bookings.

This is not part of normal app startup and uses a different hard-coded ID scheme than the main startup seed.

Use it carefully on a scratch database only.

## Development Recommendations

### Local demo mode

Use this when you want the app to come up quickly with demo users and inventory.

Recommended settings:

- Real local MongoDB running
- `ENABLE_DEMO_SEED=True`
- `USE_MOCK_DB=False`
- No live Stripe or AWS credentials required unless you are testing those paths

Behavior:

- First startup seeds demo users and equipment
- Later startups reuse the existing database data

### Local integration mode

Use this when you want realistic persistence while still keeping demo accounts available.

Recommended settings:

- Real MongoDB
- `ENABLE_DEMO_SEED=True` for the first boot of a fresh database
- `USE_MOCK_DB=False`
- Keep the same database between runs

Behavior:

- Demo data is only inserted when the relevant collections are empty
- Your own changes persist in MongoDB across restarts

### Production-style mode

Use this when validating a deployment-like setup.

Recommended settings:

- Real MongoDB only
- `ENABLE_DEMO_SEED=False`
- `USE_MOCK_DB=False`
- Strong `SECRET_KEY`
- Real SMTP/Stripe/S3 credentials only if needed
- No `mongomock_motor` package in the environment

Behavior:

- No demo credentials or demo inventory are inserted automatically
- Only operator-created data should exist

## Resetting Demo Data

If you want the normal startup seed to run again, start with an empty target database or empty relevant collections.

Typical approach:

1. Stop the app.
2. Clear the local development database or create a fresh one.
3. Ensure `ENABLE_DEMO_SEED=True`.
4. Start the backend again.

Because the seed checks collection counts, leaving existing users or equipment in place will usually prevent reseeding for those collections.

## Manual Seed Scripts

These scripts are available under `backend/app/db/`:

- `seed_equipment.py`
- `seed_users_bookings.py`

They are best treated as one-off helpers for scratch environments.

Cautions:

- They are not run automatically by FastAPI startup.
- They may produce a dataset shape that differs from the default startup seed.
- `seed_users_bookings.py` is especially demo-oriented and can create lots of synthetic bookings.

## Demo Accounts

The default demo credentials are stored in `backend/app/db/demo_credentials.json`.

At the time of writing, they include:

- `farmer@cropgear.com`
- `owner@cropgear.com`
- `owner2@cropgear.com`
- `owner3@cropgear.com`
- `owner4@cropgear.com`
- `admin@cropgear.com`

The shared demo password is:

- `Demo@123`

## Troubleshooting

### Demo users did not appear

Check:

- `ENABLE_DEMO_SEED=True`
- The backend connected successfully to the intended database
- The `users` collection was empty on first boot
- You are not looking at a different MongoDB database name than `DATABASE_NAME`

### Data disappeared after restart

Possible causes:

- You enabled `USE_MOCK_DB=True` and are using an in-memory mock client
- Your MongoDB container or local database was reset
- You changed `DATABASE_NAME`

### Production environment contains demo data

Check:

- `ENABLE_DEMO_SEED` should be `False`
- The target database should be clean before first production boot
- Manual seed scripts should not be run against production data

## Related Files

- `backend/app/db/client.py`
- `backend/app/db/seed.py`
- `backend/app/db/mock_data.py`
- `backend/app/db/demo_credentials.json`
- `backend/app/db/seed_equipment.py`
- `backend/app/db/seed_users_bookings.py`
