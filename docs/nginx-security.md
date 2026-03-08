# Nginx Security And TLS Setup (Task E3)

This config secures the Project Lunar reverse proxy with:
- Strict response security headers
- HTTPS-only access (HTTP redirected to HTTPS)
- Frontend static serving with SPA fallback
- Backend proxy routes for API and websocket-compatible paths

## 1) Install config

Copy [`infra/nginx/project-lunar.conf`](../infra/nginx/project-lunar.conf) to:

```bash
sudo cp infra/nginx/project-lunar.conf /etc/nginx/sites-available/project-lunar.conf
sudo ln -s /etc/nginx/sites-available/project-lunar.conf /etc/nginx/sites-enabled/project-lunar.conf
```

Update these values before enabling:
- `server_name lunar.example.com`
- `root /var/www/project-lunar/frontend/dist`
- `ssl_certificate` and `ssl_certificate_key`

## 2) Validate and reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3) Header inspection check

Run the validation script:

```bash
python3 scripts/check_nginx_headers.py --base-url https://lunar.example.com
```

If using a self-signed cert in staging:

```bash
python3 scripts/check_nginx_headers.py --base-url https://lunar.example.com --insecure
```

## 4) Manual spot checks

```bash
curl -Ik https://lunar.example.com/
curl -Ik https://lunar.example.com/health
curl -Ik "https://lunar.example.com/api/v1/dashboard?lat=40.7128&lon=-74.006&date=2026-03-07"
```

Expected:
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
