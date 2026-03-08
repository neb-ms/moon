# Backup and Recovery Basics (Task H2)

This runbook protects Project Lunar runtime config and state with a reproducible
archive workflow.

## 1) What gets backed up by default

`scripts/backup_runtime_state.py backup` includes these paths:

- `/etc/project-lunar` (required)
- `/var/lib/project-lunar` (required)
- `/opt/project-lunar/releases`
- `/etc/nginx/sites-available/project-lunar.conf`
- `/etc/nginx/sites-enabled/project-lunar.conf`
- `/etc/systemd/system/project-lunar-api.service`
- `/etc/systemd/system/project-lunar-cloudflared.service`
- `/etc/systemd/system/project-lunar-frontend-sync.service`
- `/etc/cloudflared/config.yml`
- `/etc/cloudflared/*.json`
- `/etc/ssl/project-lunar`

The script writes:

- `project-lunar-backup-<label-or-timestamp>.tar.gz`
- `project-lunar-backup-<...>.tar.gz.sha256`

## 2) Create a backup

From repo root on Raspberry Pi:

```bash
python3 ./scripts/backup_runtime_state.py backup
```

Default output directory:

- `/opt/project-lunar/backups`

Custom output path and label:

```bash
python3 ./scripts/backup_runtime_state.py backup \
  --output-dir /opt/project-lunar/backups \
  --backup-label pre-upgrade
```

## 3) Restore from a backup

Restore in place (requires root for `/etc`, `/var/lib`, etc):

```bash
sudo python3 ./scripts/backup_runtime_state.py restore \
  --archive /opt/project-lunar/backups/project-lunar-backup-pre-upgrade.tar.gz \
  --allow-overwrite
```

Restore to a sandbox directory first (safe validation):

```bash
python3 ./scripts/backup_runtime_state.py restore \
  --archive /opt/project-lunar/backups/project-lunar-backup-pre-upgrade.tar.gz \
  --restore-root /tmp/project-lunar-restore-check
```

## 4) Post-restore checks

After in-place restore:

```bash
sudo systemctl daemon-reload
sudo systemctl restart project-lunar-api.service
sudo systemctl restart project-lunar-cloudflared.service || true
curl -fsS http://127.0.0.1:8000/health
```

## 5) Recovery drill status

Recovery drill tested once on **March 8, 2026** via automated test:

- `backend/tests/test_backup_runtime_state.py`
- Flow covered:
  - backup creation from sample config/state
  - restore into clean target root
  - overwrite protection failure path
  - successful restore with `--allow-overwrite`
