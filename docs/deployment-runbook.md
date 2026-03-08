# Deployment Runbook (Task F5)

This runbook defines the low-friction update flow for Project Lunar on Raspberry Pi.

## 1) Prerequisites

- Tasks F1-F4 completed
- Repository deployed at `/opt/project-lunar/app`
- Runtime venv exists at `/opt/project-lunar/venv`
- `systemd` units installed (`project-lunar-api.service`, optional `project-lunar-cloudflared.service`)
- User can run `sudo`

## 2) One-command deploy

From repo root on the Pi:

```bash
sudo ./scripts/deploy.sh
```

What this command does:
- verifies required tooling and repository state
- pulls latest changes with fast-forward safety
- creates release metadata under `/opt/project-lunar/releases/<release_id>/`
- backs up current Nginx frontend dist before replacement
- installs backend dependencies from `backend/requirements.lock`
- builds frontend production assets
- runs frontend/backend tests (can be skipped with a flag)
- syncs frontend dist to `/var/www/project-lunar/frontend/dist`
- restarts API service and optionally cloudflared if enabled
- runs API smoke checks

## 3) Dry run and controlled deploy options

Dry-run preview (no changes applied):

```bash
sudo ./scripts/deploy.sh --dry-run
```

Useful flags:
- `--skip-tests` for faster deployment when CI already validated
- `--skip-pull` when deploying currently checked-out code only
- `--ref <git-ref>` to deploy a specific tag/commit
- `--skip-sync` to avoid touching Nginx web root
- `--skip-services` to avoid `systemctl` restarts/smoke checks
- `--allow-dirty` for controlled non-clean worktree deployments

## 4) Release metadata output

Each deploy writes:
- `/opt/project-lunar/releases/<release_id>/metadata.env`

Metadata includes:
- previous git ref
- deployed git ref
- backup archive path for frontend dist (if one existed)
- service names and web dist target path

`/opt/project-lunar/releases/current` points to the latest release directory.

## 5) Rollback procedure

1. Pick a release directory:

```bash
ls -1 /opt/project-lunar/releases
```

2. Load metadata from the failed deployment:

```bash
RELEASE_ID="<release_id>"
META_FILE="/opt/project-lunar/releases/${RELEASE_ID}/metadata.env"
source "${META_FILE}"
```

3. Restore previous git ref:

```bash
cd /opt/project-lunar/app
git checkout "${previous_ref}"
```

4. Reinstall backend dependencies:

```bash
/opt/project-lunar/venv/bin/pip install -r backend/requirements.lock
```

5. Restore frontend dist backup (if available):

```bash
if [[ "${frontend_backup_available}" == "true" ]]; then
  sudo mkdir -p "${web_dist_dir}"
  sudo find "${web_dist_dir}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  sudo tar -xzf "${frontend_backup_archive}" -C "${web_dist_dir}"
fi
```

6. Restart services and validate:

```bash
sudo systemctl restart project-lunar-api.service
sudo systemctl restart project-lunar-cloudflared.service || true
curl -fsS http://127.0.0.1:8000/health
```

## 6) Recommended production cadence

1. `sudo ./scripts/deploy.sh --dry-run`
2. `sudo ./scripts/deploy.sh`
3. Validate from external network (`https://your-hostname`) and confirm service health.
