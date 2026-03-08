# Cloudflare Tunnel Setup (Task F4)

This runbook configures Cloudflare Tunnel so Project Lunar is reachable without opening router ports.

## 1) Prerequisites

- Completed [runtime provisioning](./pi-runtime-provisioning.md) and [systemd setup](./systemd-services.md)
- Nginx serving Project Lunar locally on `https://127.0.0.1:443`
- A Cloudflare-managed zone (example: `example.com`)
- `cloudflared` installed on the Raspberry Pi

Install `cloudflared` (Debian/Raspberry Pi OS) if missing:

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflared-ascii.gpg | sudo tee /usr/share/keyrings/cloudflared-archive-keyring.gpg >/dev/null
DISTRO_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")"
echo "deb [signed-by=/usr/share/keyrings/cloudflared-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared ${DISTRO_CODENAME} main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared
```

## 2) Authenticate and create tunnel

On the Pi:

```bash
cloudflared tunnel login
cloudflared tunnel create project-lunar
```

Record the generated tunnel UUID (used below as `<TUNNEL_UUID>`).

## 3) Configure tunnel ingress

Copy the template:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp infra/cloudflared/config.yml.example /etc/cloudflared/config.yml
```

Edit `/etc/cloudflared/config.yml`:
- Replace `tunnel` with `<TUNNEL_UUID>`
- Replace `credentials-file` with `/etc/cloudflared/<TUNNEL_UUID>.json`
- Replace `hostname` with your public app domain (example: `lunar.example.com`)

Config shape:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /etc/cloudflared/<TUNNEL_UUID>.json
ingress:
  - hostname: lunar.example.com
    service: https://127.0.0.1:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Validate ingress syntax:

```bash
cloudflared tunnel ingress validate /etc/cloudflared/config.yml
```

Note:
- `noTLSVerify: true` is used for local/self-managed origin certs on the Pi.
- If your origin cert chain is fully trusted by cloudflared, set `noTLSVerify: false`.

## 4) Create DNS route

Map your hostname to this tunnel:

```bash
cloudflared tunnel route dns project-lunar lunar.example.com
```

Result in Cloudflare DNS:
- `lunar.example.com` CNAME -> `<TUNNEL_UUID>.cfargotunnel.com` (proxied)

## 5) Enable and start tunnel service

This repo ships `project-lunar-cloudflared.service` (Task F3). Enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now project-lunar-cloudflared.service
sudo systemctl status project-lunar-cloudflared.service --no-pager
sudo journalctl -u project-lunar-cloudflared.service -n 100 --no-pager
```

## 6) External access validation (cellular + Wi-Fi)

From a device outside your home network:

```bash
curl -I https://lunar.example.com/
curl -I https://lunar.example.com/health
curl -I "https://lunar.example.com/api/v1/dashboard?lat=40.7128&lon=-74.006&date=2026-03-07"
```

Expected:
- HTTPS responses from Cloudflare edge
- Nginx/API routes respond successfully
- Same app behavior on cellular and non-home Wi-Fi

## 7) Troubleshooting

- Tunnel service fails to start:
  - confirm `/etc/cloudflared/config.yml` exists
  - confirm `credentials-file` path matches actual UUID JSON file
  - check logs: `sudo journalctl -u project-lunar-cloudflared.service -n 200 --no-pager`
- DNS resolves incorrectly:
  - re-run `cloudflared tunnel route dns project-lunar lunar.example.com`
  - verify proxied CNAME in Cloudflare DNS dashboard
