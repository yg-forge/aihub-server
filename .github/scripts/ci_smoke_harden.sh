#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
PASSWORD="CiTestPassword123!"

unauthorized_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/v1/ai/chat" \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-ci-smoke","messages":[{"role":"user","content":"hello"}]}')"
case "$unauthorized_code" in
  401|403) ;;
  *) echo "Expected 401/403 for unauthenticated chat, got $unauthorized_code"; exit 1 ;;
esac

curl -fsS -X POST "$BASE_URL/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"ci-user\",\"password\":\"$PASSWORD\"}"
echo

login="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"ci-user\",\"password\":\"$PASSWORD\"}")"

echo "$login" | sed 's/"accessToken":"[^"]*"/"accessToken":"***"/'
token="$(printf '%s' "$login" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])')"

response="$(curl -fsS -X POST "$BASE_URL/api/v1/ai/chat" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -d '{"model":"gpt-ci-smoke","messages":[{"role":"user","content":"hello"}]}')"
echo "$response"
printf '%s' "$response" | grep -q 'CI chat smoke test passed'

stream_code="$(curl -sS -N -o stream-response.txt -w '%{http_code}' -X POST "$BASE_URL/api/v1/ai/chat/stream" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -d '{"model":"gpt-ci-smoke","messages":[{"role":"user","content":"hello"}]}')"
test "$stream_code" = "200"
cat stream-response.txt
grep -q 'CI stream ' stream-response.txt
grep -q 'smoke test passed' stream-response.txt
grep -q '"type":"delta"' stream-response.txt
grep -q '"type":"done"' stream-response.txt

unsupported_code="$(curl -sS -o unsupported-response.txt -w '%{http_code}' -X POST "$BASE_URL/api/v1/ai/chat" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -d '{"model":"unsupported-ci-model","messages":[{"role":"user","content":"hello"}]}')"
case "$unsupported_code" in
  4*|5*) ;;
  *) echo "Expected error status for unsupported model, got $unsupported_code"; cat unsupported-response.txt; exit 1 ;;
esac
cat unsupported-response.txt
