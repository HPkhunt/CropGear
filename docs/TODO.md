# CropGear Project TODO

> **Last audited:** 2026-03-27
> Frontend build passes (`npm run build`). Frontend `vitest` passes (`8 passed`). Backend `pytest` passes (`13 passed`). Repo lint and format checks pass (`npm run lint`, `npm run format:check`). GitHub Actions CI is configured for docs/backend/frontend checks. `.env.example` now matches `config.py`. Cross-platform dev startup is available via `npm run dev` and `run_integrated.sh`. `docker-compose.yml` brings up MongoDB, Redis, the backend, and a Celery worker.
> This file tracks open work only. Completed items have been removed from this checklist and should live in README/docs context plus git history.
> All open UI/UX and frontend implementation work now lives in `docs/ui-ux-roadmap.md`.

---

## P1 - Roadmap Features

- [ ] Live Tracking Map
- [ ] Predictive Pricing
- [ ] KYC / Verification Workflow
- [ ] Field Service Tickets

---

## P2 - Platform Hardening & Cleanup

### Boundaries and ownership

- [ ] **Separate demo behavior from production.**
  Demo data is better documented now, but seeded/demo behavior is still mixed into user-facing product flows.

- [ ] **Clean up duplicate feature surfaces.**
  Admin approval still has parallel concepts, `Docs.jsx` roadmap ideas can drift from real delivery, and some backend features remain implemented-but-unsurfaced.

### Reliability

- [ ] **Review unicode/encoding consistency.**
  Some terminal output still shows mojibake. Confirm all source files are UTF-8 and normalize any bad text.

---

## Frontend Backlog

The single source of truth for open UI/UX and frontend implementation tasks is [docs/ui-ux-roadmap.md](ui-ux-roadmap.md).

---

## Suggested Implementation Order

1. **Harden product boundaries** - separate demo behavior from production and remove duplicate feature surfaces.
2. **Improve reliability** - finish encoding cleanup so runtime and terminal output stay predictable.
3. **Execute frontend work from the dedicated roadmap** - use `docs/ui-ux-roadmap.md` for all UI/UX, frontend architecture, and frontend testing tasks.
