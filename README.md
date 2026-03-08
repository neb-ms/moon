# Project Lunar

Project Lunar is a self-hosted moon dashboard and calendar app designed for a Raspberry Pi Zero 2 W.

This repository currently includes **Tasks A2-B5**:
- FastAPI app entrypoint
- `GET /health` endpoint
- Typed environment settings module
- React + Vite frontend shell
- Tailwind CSS configuration and dark theme design tokens
- Lint/test tooling baseline and CI workflow (Task A4)
- Moon domain schemas and astronomy services (`skyfield`)
- MVP API endpoints:
  - `GET /api/v1/dashboard?lat&lon&date`
  - `GET /api/v1/calendar?lat&lon&month`

## Repository Layout

- `frontend/` - React + Vite + Tailwind app shell
- `backend/` - FastAPI service + lunar domain/API logic
- `infra/` - deployment/runtime configuration (Nginx, systemd, tunnel)
- `scripts/` - helper scripts for local/dev/deploy workflows
- `docs/` - architecture, runbooks, and project documentation

## Local Run Instructions

Prerequisites:
- Python 3.11+
- Node.js 20+ and npm

Run the backend locally:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

API smoke checks:

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8000/api/v1/dashboard?lat=40.7128&lon=-74.006&date=2026-03-07"
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8000/api/v1/calendar?lat=40.7128&lon=-74.006&month=2026-02"
```

Run the frontend locally:

```powershell
cd frontend
npm install
npm run dev
```

Quality checks:

```powershell
python -m pip install -r backend/requirements-dev.txt
python -m ruff check backend
python -m ruff format --check backend
python -m pytest backend/tests

cd frontend
npm install
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

Production artifact build:

```powershell
cd frontend
npm ci
npm run build

python -m pip install -r backend/requirements.lock
```

Backend startup command (production profile):

```powershell
cd backend
./start_api.ps1
```

Raspberry Pi runtime provisioning (Task F2):

```bash
sudo ./scripts/provision_pi_runtime.sh
```

Install Node.js too (only if building frontend on the Pi):

```bash
sudo ./scripts/provision_pi_runtime.sh --with-node
```

Provisioning details and filesystem layout:
- `docs/pi-runtime-provisioning.md`
- `docs/systemd-services.md`
- `docs/cloudflare-tunnel.md`
- `docs/deployment-runbook.md`
- `docs/accessibility-checklist.md`

Dependency security checks:

```powershell
python -m pip install pip-audit
pip-audit -r backend/requirements.txt

cd frontend
npm audit --audit-level=high
```

Secret/dependency handling notes:
- `docs/secrets-and-dependencies.md`
- `docs/production-artifacts.md`
- `docs/pi-runtime-provisioning.md`
- `docs/systemd-services.md`
- `docs/cloudflare-tunnel.md`
- `docs/deployment-runbook.md`
- `docs/accessibility-checklist.md`

## Next Tasks

- `C1`: build app shell and routing state integration with backend APIs
- `C2`: build daily dashboard hero UI components
