#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${SOURCE_DIR:-/opt/project-lunar/app/frontend/dist}"
TARGET_DIR="${TARGET_DIR:-/var/www/project-lunar/frontend/dist}"
APP_USER="${APP_USER:-lunar}"
APP_GROUP="${APP_GROUP:-${APP_USER}}"

log() {
  printf '[frontend-sync] %s\n' "$1"
}

fail() {
  printf '[frontend-sync] ERROR: %s\n' "$1" >&2
  exit 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run as root so ownership and nginx reload can succeed."
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  fail "Source frontend build does not exist: ${SOURCE_DIR}"
fi

mkdir -p "${TARGET_DIR}"
cp -a "${SOURCE_DIR}/." "${TARGET_DIR}/"
chown -R "${APP_USER}:${APP_GROUP}" "${TARGET_DIR}"

if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx
  log "Reloaded nginx."
fi

log "Frontend dist synced from ${SOURCE_DIR} to ${TARGET_DIR}."
