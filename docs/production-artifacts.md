# Production Artifacts (Task F1)

## Frontend artifact

Build the static frontend bundle:

```bash
cd frontend
npm ci
npm run build
```

Output directory:
- `frontend/dist/`

## Backend runtime package

Runtime dependencies:
- [`backend/requirements.txt`](../backend/requirements.txt)

Pinned lock file (includes transitive dependencies):
- [`backend/requirements.lock`](../backend/requirements.lock)

Install from lock in production:

```bash
python -m pip install -r backend/requirements.lock
```

## Backend startup command

Linux (Raspberry Pi target):

```bash
cd /path/to/project/backend
./start_api.sh
```

Windows/PowerShell:

```powershell
cd backend
./start_api.ps1
```

Default command behavior:
- binds to `127.0.0.1:8000`
- runs uvicorn with `--proxy-headers`
- uses `LUNAR_API_HOST`, `LUNAR_API_PORT`, `LUNAR_API_WORKERS`, `LUNAR_LOG_LEVEL` if set
