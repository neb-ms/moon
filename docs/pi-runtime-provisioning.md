# Raspberry Pi Runtime Provisioning (Task F2)

This runbook provisions a fresh Raspberry Pi OS (Debian-based) host for Project Lunar runtime.

It installs:
- Python 3 + venv tooling
- Nginx
- Optional Node.js (build-only on Pi)

It also creates a standardized filesystem layout for deploy and operations.

## 1) Prerequisites

- Raspberry Pi OS Lite/Full (Debian-based), 64-bit recommended
- Network access for apt package install
- A sudo-capable user
- Project Lunar repository cloned on the Pi

## 2) Provision command

Runtime-only (no Node.js):

```bash
sudo ./scripts/provision_pi_runtime.sh
```

Runtime + Node.js 20 (if building frontend on the Pi):

```bash
sudo ./scripts/provision_pi_runtime.sh --with-node
```

Use another Node major version if required:

```bash
sudo ./scripts/provision_pi_runtime.sh --with-node --node-major 22
```

## 3) Standardized filesystem layout

The script creates:

- `/opt/project-lunar/app` - repository checkout target
- `/opt/project-lunar/venv` - Python virtual environment for API runtime
- `/etc/project-lunar/api.env` - runtime environment variables consumed by service scripts
- `/var/www/project-lunar/frontend/dist` - frontend static build output served by Nginx
- `/var/log/project-lunar` - app/service log directory
- `/var/lib/project-lunar` - app state/cache directory

Default service user:
- `lunar` (system user with no interactive shell)

## 4) Verification checks

Run on the Pi after provisioning:

```bash
python3 --version
nginx -v
systemctl status nginx --no-pager
ls -ld /opt/project-lunar /etc/project-lunar /var/www/project-lunar /var/log/project-lunar /var/lib/project-lunar
```

If Node.js was installed:

```bash
node --version
npm --version
```

## 5) Notes

- Provisioning script is intended to be idempotent; rerunning should converge host setup.
- This task only prepares runtime dependencies and directories. Service setup (`systemd`) is handled in Task F3.
