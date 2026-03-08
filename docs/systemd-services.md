# Systemd Service Setup (Task F3)

This runbook installs Project Lunar `systemd` units for:
- API auto-start/restart
- Cloudflare Tunnel auto-start/restart
- Optional frontend sync + Nginx reload

## 1) Prerequisites

- Complete [Task F2 runtime provisioning](./pi-runtime-provisioning.md)
- Repository deployed at `/opt/project-lunar/app`
- Python deps installed in `/opt/project-lunar/venv`
- Frontend build available at `/opt/project-lunar/app/frontend/dist` (for optional sync service)

## 2) Install unit files

From repo root on the Pi:

```bash
sudo cp infra/systemd/project-lunar-api.service /etc/systemd/system/
sudo cp infra/systemd/project-lunar-cloudflared.service /etc/systemd/system/
sudo cp infra/systemd/project-lunar-frontend-sync.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/project-lunar-*.service
```

Ensure scripts used by services exist and are executable:

```bash
sudo chmod +x /opt/project-lunar/app/backend/start_api.sh
sudo chmod +x /opt/project-lunar/app/scripts/sync_frontend_dist.sh
```

Reload unit registry:

```bash
sudo systemctl daemon-reload
```

## 3) Enable and start API service

```bash
sudo systemctl enable --now project-lunar-api.service
sudo systemctl status project-lunar-api.service --no-pager
sudo journalctl -u project-lunar-api.service -n 100 --no-pager
```

Expected status:
- `Active: active (running)`

## 4) Enable cloudflared service

The unit expects `/etc/cloudflared/config.yml` to exist (configured in [Task F4](./cloudflare-tunnel.md)).

```bash
sudo systemctl enable --now project-lunar-cloudflared.service
sudo systemctl status project-lunar-cloudflared.service --no-pager
sudo journalctl -u project-lunar-cloudflared.service -n 100 --no-pager
```

If tunnel config is missing, the unit remains skipped due to condition check.

## 5) Optional frontend sync service

Run once after deploying a fresh frontend build:

```bash
sudo systemctl start project-lunar-frontend-sync.service
sudo systemctl status project-lunar-frontend-sync.service --no-pager
```

Enable at boot (optional):

```bash
sudo systemctl enable project-lunar-frontend-sync.service
```

## 6) Reboot persistence check

```bash
sudo reboot
```

After reconnecting:

```bash
sudo systemctl status project-lunar-api.service --no-pager
sudo systemctl status project-lunar-cloudflared.service --no-pager
sudo systemctl is-enabled project-lunar-api.service
sudo systemctl is-enabled project-lunar-cloudflared.service
```

Expected:
- API service remains `active (running)` and `enabled`
- cloudflared is `enabled` and either `active (running)` or `skipped` until F4 tunnel config is present
