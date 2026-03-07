# Project Lunar

Project Lunar is a self-hosted moon dashboard and calendar app designed for a Raspberry Pi Zero 2 W.

This repository currently includes **Tasks A2-A3 scaffolds**:
- FastAPI app entrypoint
- `GET /health` endpoint
- Typed environment settings module
- React + Vite frontend shell
- Tailwind CSS configuration and dark theme design tokens

## Repository Layout

- `frontend/` - React + Vite + Tailwind app shell
- `backend/` - FastAPI service scaffold (`/health` endpoint)
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

Run the frontend locally:

```powershell
cd frontend
npm install
npm run dev
```

## Next Tasks

- `A4`: add lint/test tooling and CI baseline
- `B1`: define moon domain models and serialization tests
