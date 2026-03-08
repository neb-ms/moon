#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-lunar}"
APP_GROUP="${APP_GROUP:-}"
APP_ROOT="${APP_ROOT:-/opt/project-lunar}"
APP_DIR="${APP_ROOT}/app"
VENV_DIR="${APP_ROOT}/venv"
ENV_DIR="${ENV_DIR:-/etc/project-lunar}"
WEB_ROOT="${WEB_ROOT:-/var/www/project-lunar}"
FRONTEND_DIST_DIR="${WEB_ROOT}/frontend/dist"
LOG_DIR="${LOG_DIR:-/var/log/project-lunar}"
DATA_DIR="${DATA_DIR:-/var/lib/project-lunar}"
INSTALL_NODE=false
NODE_MAJOR="${NODE_MAJOR:-20}"

usage() {
  cat <<EOF
Usage: sudo ./scripts/provision_pi_runtime.sh [options]

Options:
  --with-node         Install Node.js (use when building frontend on the Pi).
  --node-major <n>    Node.js major version for NodeSource setup script (default: 20).
  -h, --help          Show this help message.

Environment overrides:
  APP_USER, APP_GROUP, APP_ROOT, ENV_DIR, WEB_ROOT, LOG_DIR, DATA_DIR, NODE_MAJOR
EOF
}

log() {
  printf '[provision] %s\n' "$1"
}

fail() {
  printf '[provision] ERROR: %s\n' "$1" >&2
  exit 1
}

require_apt() {
  if ! command -v apt-get >/dev/null 2>&1; then
    fail "This script requires apt-get (Debian-based Raspberry Pi OS)."
  fi
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Run this script as root (for example: sudo ./scripts/provision_pi_runtime.sh)."
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --with-node)
        INSTALL_NODE=true
        shift
        ;;
      --node-major)
        [[ $# -ge 2 ]] || fail "--node-major requires a value."
        NODE_MAJOR="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown option: $1"
        ;;
    esac
  done
}

install_base_packages() {
  export DEBIAN_FRONTEND=noninteractive
  log "Updating apt package index."
  apt-get update

  local -a packages=(
    ca-certificates
    curl
    git
    gnupg
    nginx
    python3
    python3-pip
    python3-venv
  )

  log "Installing base dependencies: ${packages[*]}"
  apt-get install -y --no-install-recommends "${packages[@]}"
}

install_node_if_requested() {
  if [[ "${INSTALL_NODE}" != true ]]; then
    log "Skipping Node.js install (use --with-node to install)."
    return
  fi

  if command -v node >/dev/null 2>&1; then
    local installed_major
    installed_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [[ "${installed_major}" == "${NODE_MAJOR}" ]]; then
      log "Node.js v${NODE_MAJOR} already installed."
      return
    fi
  fi

  log "Installing Node.js v${NODE_MAJOR} from NodeSource."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y --no-install-recommends nodejs
}

ensure_app_user() {
  if id -u "${APP_USER}" >/dev/null 2>&1; then
    log "User ${APP_USER} already exists."
    return
  fi

  log "Creating system user ${APP_USER}."
  useradd \
    --system \
    --user-group \
    --create-home \
    --home-dir "/home/${APP_USER}" \
    --shell /usr/sbin/nologin \
    "${APP_USER}"
}

resolve_app_group() {
  if [[ -n "${APP_GROUP}" ]]; then
    if ! getent group "${APP_GROUP}" >/dev/null 2>&1; then
      fail "Group ${APP_GROUP} does not exist."
    fi
    return
  fi

  APP_GROUP="$(id -gn "${APP_USER}")"
  log "Using primary group ${APP_GROUP} for user ${APP_USER}."
}

create_layout() {
  log "Creating standardized filesystem layout."
  mkdir -p \
    "${APP_DIR}" \
    "${VENV_DIR}" \
    "${ENV_DIR}" \
    "${FRONTEND_DIST_DIR}" \
    "${LOG_DIR}" \
    "${DATA_DIR}"

  if [[ ! -f "${ENV_DIR}/api.env" ]]; then
    cat > "${ENV_DIR}/api.env" <<'EOF'
LUNAR_API_HOST=127.0.0.1
LUNAR_API_PORT=8000
LUNAR_API_WORKERS=1
LUNAR_LOG_LEVEL=info
EOF
    chmod 640 "${ENV_DIR}/api.env"
  fi

  if [[ ! -d "${VENV_DIR}/bin" ]]; then
    log "Creating Python virtual environment in ${VENV_DIR}."
    python3 -m venv "${VENV_DIR}"
  fi
}

set_permissions() {
  log "Applying ownership and permissions."
  chown -R "${APP_USER}:${APP_GROUP}" "${APP_ROOT}" "${LOG_DIR}" "${DATA_DIR}"
  chmod 750 "${APP_ROOT}" "${APP_DIR}" "${LOG_DIR}" "${DATA_DIR}"
  chown root:root "${ENV_DIR}"
  chmod 750 "${ENV_DIR}"
  chown root:"${APP_GROUP}" "${ENV_DIR}/api.env"

  chown -R "${APP_USER}:${APP_GROUP}" "${WEB_ROOT}"
  chmod 755 "${WEB_ROOT}" "${WEB_ROOT}/frontend" "${FRONTEND_DIST_DIR}"
}

print_summary() {
  log "Provisioning complete."
  python3 --version
  nginx -v
  if command -v node >/dev/null 2>&1; then
    node --version
    npm --version
  else
    log "Node.js not installed in this run."
  fi

  cat <<EOF

Filesystem layout:
  app root:      ${APP_ROOT}
  app checkout:  ${APP_DIR}
  venv:          ${VENV_DIR}
  env files:     ${ENV_DIR}
  frontend dist: ${FRONTEND_DIST_DIR}
  logs:          ${LOG_DIR}
  data/cache:    ${DATA_DIR}
EOF
}

main() {
  parse_args "$@"
  require_root
  require_apt
  install_base_packages
  install_node_if_requested
  ensure_app_user
  resolve_app_group
  create_layout
  set_permissions
  print_summary
}

main "$@"
