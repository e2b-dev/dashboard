#!/usr/bin/env bash
# Builds the container image and checks the three responses a self-hosted
# install depends on. Needs Docker and outbound HTTPS: the Next build pulls
# the Google Fonts faces declared in src/app/fonts.ts.
set -euo pipefail

IMAGE="${IMAGE:-e2b-dashboard:smoke}"
PORT="${PORT:-3001}"
CONTAINER="e2b-dashboard-smoke-$$"
INVALID_CONTAINER="${CONTAINER}-invalid"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  docker rm -f "${CONTAINER}" "${INVALID_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> building ${IMAGE}"
docker build -t "${IMAGE}" "${ROOT}"

echo "==> starting ${CONTAINER} on port ${PORT}"
docker run -d --name "${CONTAINER}" -e PORT="${PORT}" -e PUBLIC_E2B_DOMAIN=smoke.invalid -p "${PORT}:${PORT}" "${IMAGE}" >/dev/null

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

check_invalid_config() {
  local variable="$1" value="$2" status="" exit_code logs
  docker run -d --name "${INVALID_CONTAINER}" --network none \
    -e PUBLIC_E2B_DOMAIN=smoke.invalid -e "${variable}=${value}" "${IMAGE}" >/dev/null

  for _ in $(seq 1 50); do
    status="$(docker inspect -f '{{.State.Status}}' "${INVALID_CONTAINER}")"
    if [ "${status}" = "exited" ]; then break; fi
    sleep 0.2
  done

  exit_code="$(docker inspect -f '{{.State.ExitCode}}' "${INVALID_CONTAINER}")"
  logs="$(docker logs "${INVALID_CONTAINER}" 2>&1)"
  if [ "${status}" != "exited" ] || [ "${exit_code}" = "0" ] || \
    [[ "${logs}" != *"${variable}"* ]]; then
    echo "FAIL: invalid ${variable} must stop startup and name the variable" >&2
    echo "${logs}" >&2
    exit 1
  fi
  echo "ok   invalid ${variable} rejected at startup"
  docker rm "${INVALID_CONTAINER}" >/dev/null
}

check_invalid_config PUBLIC_SANDBOX_URL missing-scheme.example:3002
check_invalid_config PUBLIC_E2B_DOMAIN ''
check_invalid_config E2B_INFRA_API_URL ftp://api.example
check_invalid_config E2B_DASHBOARD_API_URL missing-scheme.example:3010
check_invalid_config E2B_SANDBOX_URL https://sandbox.example
check_invalid_config NEXT_PUBLIC_E2B_DOMAIN old.example
check_invalid_config NEXT_PUBLIC_INFRA_API_URL https://api.old.example
check_invalid_config NEXT_PUBLIC_DASHBOARD_API_URL https://dashboard-api.old.example
check_invalid_config NEXT_PUBLIC_E2B_SANDBOX_URL https://sandbox.old.example
check_invalid_config DASHBOARD_COOKIE_SECURE off

echo "==> container smoke test passed"
