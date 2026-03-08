#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
SKIP_PULL=false
SKIP_TESTS=false
SKIP_SYNC=false
SKIP_SERVICES=false
ALLOW_DIRTY=false
REF=""

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy.sh [options]

One-command deployment flow for Project Lunar on Raspberry Pi.

Options:
  --dry-run            Print planned actions without changing files/services.
  --skip-pull          Skip git fetch/pull step.
  --ref <git-ref>      Deploy a specific commit/tag/branch ref.
  --skip-tests         Skip frontend/backend test commands.
  --skip-sync          Skip syncing frontend dist to Nginx web root.
  --skip-services      Skip systemd restart and API smoke checks.
  --allow-dirty        Allow deploy from a dirty git worktree.
  -h, --help           Show this help message.

Environment overrides:
  REPO_DIR             Repo checkout path (default: parent of this script)
  APP_ROOT             App root (default: parent of REPO_DIR)
  RELEASES_DIR         Release metadata directory (default: $APP_ROOT/releases)
  VENV_DIR             Python venv path (default: $APP_ROOT/venv)
  FRONTEND_DIR         Frontend path (default: $REPO_DIR/frontend)
  BACKEND_DIR          Backend path (default: $REPO_DIR/backend)
  WEB_DIST_DIR         Nginx web root dist path (default: /var/www/project-lunar/frontend/dist)
  SYNC_SCRIPT          Frontend sync script path (default: $REPO_DIR/scripts/sync_frontend_dist.sh)
  API_SERVICE          systemd API service name (default: project-lunar-api.service)
  CLOUDFLARED_SERVICE  systemd cloudflared service name (default: project-lunar-cloudflared.service)
  APP_USER             Ownership user used by sync step (default: lunar)
  APP_GROUP            Ownership group used by sync step (default: lunar)
  GIT_REMOTE           Remote name for pull operations (default: origin)
  HEALTH_URL           API health URL for smoke check (default: http://127.0.0.1:8000/health)
  DASHBOARD_SMOKE_URL  Dashboard URL for smoke check.
EOF
}

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

format_cmd() {
  local chunk output=""
  for chunk in "$@"; do
    output+="${output:+ }$(printf '%q' "$chunk")"
  done
  printf '%s' "${output}"
}

run_cmd() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "[dry-run] $(format_cmd "$@")"
    return 0
  fi
  "$@"
}

run_root_cmd() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "[dry-run] sudo $(format_cmd "$@")"
    return 0
  fi

  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
    return 0
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
    return 0
  fi

  fail "Command requires root privileges and sudo is unavailable: $(format_cmd "$@")"
}

ensure_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    fail "Required command not found: ${command_name}"
  fi
}

ensure_file() {
  local file_path="$1"
  [[ -f "${file_path}" ]] || fail "Required file not found: ${file_path}"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --skip-pull)
        SKIP_PULL=true
        shift
        ;;
      --ref)
        [[ $# -ge 2 ]] || fail "--ref requires a value"
        REF="$2"
        shift 2
        ;;
      --skip-tests)
        SKIP_TESTS=true
        shift
        ;;
      --skip-sync)
        SKIP_SYNC=true
        shift
        ;;
      --skip-services)
        SKIP_SERVICES=true
        shift
        ;;
      --allow-dirty)
        ALLOW_DIRTY=true
        shift
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

select_python() {
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
    return
  fi
  fail "Python interpreter not found (expected python3 or python)."
}

resolve_venv_paths() {
  VENV_PIP="${VENV_DIR}/bin/pip"
  VENV_PYTHON="${VENV_DIR}/bin/python"

  if [[ -x "${VENV_DIR}/Scripts/pip.exe" ]]; then
    VENV_PIP="${VENV_DIR}/Scripts/pip.exe"
  fi

  if [[ -x "${VENV_DIR}/Scripts/python.exe" ]]; then
    VENV_PYTHON="${VENV_DIR}/Scripts/python.exe"
  fi
}

check_git_tree_state() {
  if [[ "${ALLOW_DIRTY}" == true ]]; then
    log "Dirty worktree allowed by flag."
    return
  fi

  if [[ -n "$(git -C "${REPO_DIR}" status --porcelain)" ]]; then
    fail "Git worktree is dirty. Commit/stash or rerun with --allow-dirty."
  fi
}

pull_or_checkout_ref() {
  if [[ -n "${REF}" ]]; then
    run_cmd git -C "${REPO_DIR}" checkout "${REF}"
    return
  fi

  if [[ "${SKIP_PULL}" == true ]]; then
    log "Skipping git pull step."
    return
  fi

  local branch_name
  branch_name="$(git -C "${REPO_DIR}" rev-parse --abbrev-ref HEAD)"
  if [[ "${branch_name}" == "HEAD" ]]; then
    fail "Detached HEAD detected. Use --ref <git-ref> or checkout a branch."
  fi

  run_cmd git -C "${REPO_DIR}" fetch --prune "${GIT_REMOTE}"
  run_cmd git -C "${REPO_DIR}" pull --ff-only "${GIT_REMOTE}" "${branch_name}"
}

capture_frontend_backup() {
  FRONTEND_BACKUP_ARCHIVE="${RELEASE_DIR}/frontend-dist-before.tar.gz"
  FRONTEND_BACKUP_AVAILABLE=false

  if [[ ! -d "${WEB_DIST_DIR}" ]]; then
    log "No existing web dist directory found at ${WEB_DIST_DIR}; skipping backup."
    return
  fi

  if [[ -z "$(find "${WEB_DIST_DIR}" -mindepth 1 -print -quit 2>/dev/null)" ]]; then
    log "Web dist directory is empty at ${WEB_DIST_DIR}; skipping backup."
    return
  fi

  run_root_cmd tar -czf "${FRONTEND_BACKUP_ARCHIVE}" -C "${WEB_DIST_DIR}" .
  FRONTEND_BACKUP_AVAILABLE=true
  log "Captured frontend backup: ${FRONTEND_BACKUP_ARCHIVE}"
}

prepare_python_environment() {
  if [[ ! -d "${VENV_DIR}" ]]; then
    run_cmd "${PYTHON_BIN}" -m venv "${VENV_DIR}"
  fi

  resolve_venv_paths
  if [[ "${DRY_RUN}" != true && ! -x "${VENV_PYTHON}" ]]; then
    fail "Python not found in virtual environment: ${VENV_PYTHON}"
  fi

  run_cmd "${VENV_PYTHON}" -m pip install --upgrade pip
  run_cmd "${VENV_PYTHON}" -m pip install -r "${BACKEND_DIR}/requirements.lock"
}

build_frontend() {
  run_cmd npm --prefix "${FRONTEND_DIR}" ci
  run_cmd npm --prefix "${FRONTEND_DIR}" run build
}

run_tests() {
  if [[ "${SKIP_TESTS}" == true ]]; then
    log "Skipping test runs."
    return
  fi

  resolve_venv_paths
  if [[ "${DRY_RUN}" != true && ! -x "${VENV_PYTHON}" ]]; then
    fail "Python not found in virtual environment: ${VENV_PYTHON}"
  fi

  run_cmd npm --prefix "${FRONTEND_DIR}" run test -- --run
  run_cmd "${VENV_PYTHON}" -m pytest "${BACKEND_DIR}/tests"
}

sync_frontend_dist() {
  if [[ "${SKIP_SYNC}" == true ]]; then
    log "Skipping frontend sync step."
    return
  fi

  ensure_file "${SYNC_SCRIPT}"
  run_root_cmd env \
    SOURCE_DIR="${FRONTEND_DIR}/dist" \
    TARGET_DIR="${WEB_DIST_DIR}" \
    APP_USER="${APP_USER}" \
    APP_GROUP="${APP_GROUP}" \
    /usr/bin/env bash "${SYNC_SCRIPT}"
}

restart_services() {
  if [[ "${SKIP_SERVICES}" == true ]]; then
    log "Skipping service restart step."
    return
  fi

  run_root_cmd systemctl daemon-reload
  run_root_cmd systemctl restart "${API_SERVICE}"
  run_root_cmd systemctl is-active --quiet "${API_SERVICE}"

  if [[ "${DRY_RUN}" == true ]]; then
    log "[dry-run] check and restart ${CLOUDFLARED_SERVICE} when enabled."
    return
  fi

  if run_root_cmd systemctl is-enabled --quiet "${CLOUDFLARED_SERVICE}"; then
    run_root_cmd systemctl restart "${CLOUDFLARED_SERVICE}"
  else
    log "${CLOUDFLARED_SERVICE} is not enabled; skipping restart."
  fi
}

run_smoke_checks() {
  if [[ "${SKIP_SERVICES}" == true ]]; then
    log "Skipping smoke checks because services were not restarted."
    return
  fi

  run_cmd curl --fail --silent --show-error --output /dev/null "${HEALTH_URL}"
  run_cmd curl --fail --silent --show-error --output /dev/null "${DASHBOARD_SMOKE_URL}"
}

write_release_metadata() {
  local metadata_path="${RELEASE_DIR}/metadata.env"
  if [[ "${DRY_RUN}" == true ]]; then
    log "[dry-run] write deployment metadata to ${metadata_path}"
    return
  fi

  cat > "${metadata_path}" <<EOF
release_id=${RELEASE_ID}
deployed_at_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
previous_ref=${PREVIOUS_REF}
deployed_ref=${DEPLOYED_REF}
git_remote=${GIT_REMOTE}
frontend_backup_available=${FRONTEND_BACKUP_AVAILABLE}
frontend_backup_archive=${FRONTEND_BACKUP_ARCHIVE}
web_dist_dir=${WEB_DIST_DIR}
api_service=${API_SERVICE}
cloudflared_service=${CLOUDFLARED_SERVICE}
EOF

  ln -sfn "${RELEASE_DIR}" "${RELEASES_DIR}/current"
}

main() {
  parse_args "$@"

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_DIR="${REPO_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
  APP_ROOT="${APP_ROOT:-$(cd "${REPO_DIR}/.." && pwd)}"
  RELEASES_DIR="${RELEASES_DIR:-${APP_ROOT}/releases}"
  VENV_DIR="${VENV_DIR:-${APP_ROOT}/venv}"
  FRONTEND_DIR="${FRONTEND_DIR:-${REPO_DIR}/frontend}"
  BACKEND_DIR="${BACKEND_DIR:-${REPO_DIR}/backend}"
  WEB_DIST_DIR="${WEB_DIST_DIR:-/var/www/project-lunar/frontend/dist}"
  SYNC_SCRIPT="${SYNC_SCRIPT:-${REPO_DIR}/scripts/sync_frontend_dist.sh}"
  API_SERVICE="${API_SERVICE:-project-lunar-api.service}"
  CLOUDFLARED_SERVICE="${CLOUDFLARED_SERVICE:-project-lunar-cloudflared.service}"
  APP_USER="${APP_USER:-lunar}"
  APP_GROUP="${APP_GROUP:-lunar}"
  GIT_REMOTE="${GIT_REMOTE:-origin}"
  HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8000/health}"
  TODAY_UTC="$(date -u +"%Y-%m-%d")"
  DASHBOARD_SMOKE_URL="${DASHBOARD_SMOKE_URL:-http://127.0.0.1:8000/api/v1/dashboard?lat=40.7128&lon=-74.006&date=${TODAY_UTC}}"

  ensure_command git
  ensure_command npm
  ensure_command tar
  ensure_command curl
  select_python
  if [[ "${SKIP_SERVICES}" != true && "${DRY_RUN}" != true ]]; then
    ensure_command systemctl
  fi

  ensure_file "${FRONTEND_DIR}/package.json"
  ensure_file "${BACKEND_DIR}/requirements.lock"
  ensure_file "${BACKEND_DIR}/start_api.sh"
  ensure_file "${SYNC_SCRIPT}"

  git -C "${REPO_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "REPO_DIR is not a git repository: ${REPO_DIR}"

  check_git_tree_state

  PREVIOUS_REF="$(git -C "${REPO_DIR}" rev-parse HEAD)"
  pull_or_checkout_ref
  DEPLOYED_REF="$(git -C "${REPO_DIR}" rev-parse HEAD)"

  RELEASE_ID="$(date -u +"%Y%m%dT%H%M%SZ")-${DEPLOYED_REF:0:8}"
  RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
  run_cmd mkdir -p "${RELEASE_DIR}"

  capture_frontend_backup
  prepare_python_environment
  build_frontend
  run_tests
  sync_frontend_dist
  restart_services
  run_smoke_checks
  write_release_metadata

  log "Deployment complete."
  log "Release ID: ${RELEASE_ID}"
  log "Previous ref: ${PREVIOUS_REF}"
  log "Deployed ref: ${DEPLOYED_REF}"
  if [[ "${DRY_RUN}" == true ]]; then
    log "Dry-run mode: no changes were applied."
  else
    log "Release metadata: ${RELEASE_DIR}/metadata.env"
  fi
}

main "$@"
