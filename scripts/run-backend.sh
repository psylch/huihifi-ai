#!/usr/bin/env bash

# Helper script to run the HuiHiFi backend with uv.
# Usage:
#   ./scripts/run-backend.sh start    # install deps (if needed) + run in foreground
#   ./scripts/run-backend.sh daemon   # run in background (logs -> backend.log)
#   ./scripts/run-backend.sh stop     # stop daemonized backend

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/aituning_service"
UV_CACHE_DIR="${BACKEND_DIR}/.uv-cache"
LOG_FILE="${BACKEND_DIR}/backend.log"
PID_FILE="${BACKEND_DIR}/backend.pid"

ensure_uv() {
  if ! command -v uv >/dev/null 2>&1; then
    echo "error: uv not found. Install via 'brew install uv' or see https://github.com/astral-sh/uv" >&2
    exit 1
  fi
}

sync_dependencies() {
  ensure_uv
  echo "→ Syncing backend dependencies with uv"
  (cd "${BACKEND_DIR}" && UV_CACHE_DIR="${UV_CACHE_DIR}" uv pip sync requirements.txt)
}

start_foreground() {
  sync_dependencies
  echo "→ Starting Flask backend on http://127.0.0.1:5005"
  (cd "${BACKEND_DIR}" && UV_CACHE_DIR="${UV_CACHE_DIR}" uv run python -m flask --app app run --port 5005)
}

start_daemon() {
  sync_dependencies

  if [[ -f "${PID_FILE}" ]] && ps -p "$(cat "${PID_FILE}")" >/dev/null 2>&1; then
    echo "Backend already running with PID $(cat "${PID_FILE}")"
    exit 0
  fi

  echo "→ Launching backend in background (logs: ${LOG_FILE})"
  (cd "${BACKEND_DIR}" && \
    UV_CACHE_DIR="${UV_CACHE_DIR}" nohup uv run python -m flask --app app run --port 5005 >"${LOG_FILE}" 2>&1 & echo $! > "${PID_FILE}")

  sleep 1
  if [[ -f "${PID_FILE}" ]] && ps -p "$(cat "${PID_FILE}")" >/dev/null 2>&1; then
    echo "Backend started (PID $(cat "${PID_FILE}")). Tail logs via: tail -f ${LOG_FILE}"
  else
    echo "Failed to start backend. Check ${LOG_FILE} for details." >&2
    exit 1
  fi
}

stop_daemon() {
  if [[ -f "${PID_FILE}" ]]; then
    PID="$(cat "${PID_FILE}")"
    if ps -p "${PID}" >/dev/null 2>&1; then
      echo "→ Stopping backend (PID ${PID})"
      kill "${PID}"
    fi
    rm -f "${PID_FILE}"
  else
    echo "No PID file found. Use 'pkill -f \"flask --app app\"' if needed."
  fi
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <start|daemon|stop>
  start   Install dependencies (if needed) and run backend in foreground.
  daemon  Install dependencies (if needed) and run backend in background (logs in backend.log).
  stop    Stop the background backend started via 'daemon'.
EOF
}

cmd="${1:-}"
case "${cmd}" in
  start)
    start_foreground
    ;;
  daemon)
    start_daemon
    ;;
  stop)
    stop_daemon
    ;;
  *)
    usage
    exit 1
    ;;
esac
