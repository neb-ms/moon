# Release Checklist and Sign-Off (Task H3)

Release candidate: `MVP-v0.1`  
Checklist date: 2026-03-08

## Required Gates

| Gate | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Backend quality (lint + tests) | Backend Engineer | Signed off | `python -m ruff check backend`, `python -m pytest backend/tests -q` (36 passed) |
| Frontend quality (lint + unit tests + build) | Frontend Engineer | Signed off | `npm run lint`, `npm run test`, `npm run build` in `frontend/` |
| Critical flow E2E | QA Engineer | Signed off | `npm run test:e2e` in `frontend/` (2 passed) |
| Accessibility baseline | QA Engineer | Signed off | `npm run test:a11y` in `frontend/` (1 passed), see `docs/accessibility-checklist.md` |
| Security hardening baseline | Security Engineer | Signed off | `docs/nginx-security.md`, `docs/secrets-and-dependencies.md`, backend security tests |
| Observability/logging baseline | Operations Engineer | Signed off | `docs/observability.md`, structured request logs + `X-Request-ID` |
| Backup/recovery baseline | Operations Engineer | Signed off | `docs/backup-recovery.md`, `backend/tests/test_backup_runtime_state.py` |
| Deployment and rollback runbook | Platform Engineer | Signed off | `docs/deployment-runbook.md`, `scripts/deploy.sh` rollback procedure |
| Known limitations reviewed and accepted | Product Owner | Signed off | `docs/known-limitations.md` |

## Release Decision

- Decision: **Approved for MVP release with accepted limitations**
- Approved by:
  - Product Owner
  - Backend Engineer
  - Frontend Engineer
  - QA Engineer
  - Platform/Operations Engineer
- Approval date: **2026-03-08**

## Operational Follow-up

- Track all accepted limitations in `docs/known-limitations.md`.
- Re-run this checklist on every production release candidate.
