#!/usr/bin/env bash
# Builds the container image and checks the three responses a self-hosted
# install depends on. Needs Docker and outbound HTTPS: the Next build pulls
# the Google Fonts faces declared in src/app/fonts.ts.
set -euo pipefail

IMAGE="${IMAGE:-e2b-dashboard:smoke}"
PORT="${PORT:-3001}"
CONTAINER="e2b-dashboard-smoke-$$"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> building ${IMAGE}"
docker build -t "${IMAGE}" "${ROOT}"

echo "==> starting ${CONTAINER} on port ${PORT}"
docker run -d --name "${CONTAINER}" -e PORT="${PORT}" -p "${PORT}:${PORT}" "${IMAGE}" >/dev/null

ready=0
for _ in $(seq 1 60); do
  if curl -fs -o /dev/null "http://127.0.0.1:${PORT}/"; then
    ready=1
    break
  fi
  sleep 1
done

if [ "${ready}" != 1 ]; then
  echo "FAIL: nothing answered on port ${PORT} within 60s" >&2
  docker logs "${CONTAINER}" >&2 || true
  exit 1
fi

fail=0
check() {
  if [ "$3" = "$2" ]; then
    echo "ok   $1: $3"
  else
    echo "FAIL $1: expected $2, got $3" >&2
    fail=1
  fi
}

check "GET / serves the api key form" 200 \
  "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/")"

check "GET /sandboxes redirects to the key form" 307 \
  "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/sandboxes")"

check "GET /sandboxes redirect target" "http://127.0.0.1:${PORT}/?returnTo=%2Fsandboxes" \
  "$(curl -sS -o /dev/null -w '%{redirect_url}' "http://127.0.0.1:${PORT}/sandboxes")"

# /api/health probes dashboard-api, which this run does not provide, so 503 is
# the correct answer here and proves route handlers are being served.
check "GET /api/health without a dashboard-api" 503 \
  "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/health")"

if [ "${fail}" != 0 ]; then
  docker logs "${CONTAINER}" >&2 || true
  exit 1
fi

echo "==> container smoke test passed"
