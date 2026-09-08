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

register="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"ci-user\",\"password\":\"$PASSWORD\"}")"
echo "$register"
printf '%s' "$register" | grep -q '"role":"USER"'

echo "$register" | grep -q '"role":"SUPER_ADMIN"' && { echo "Public registration must not create SUPER_ADMIN"; exit 1; } || true
echo

login="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"ci-user\",\"password\":\"$PASSWORD\"}")"

echo "$login" | sed 's/"accessToken":"[^"]*"/"accessToken":"***"/'
token="$(printf '%s' "$login" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["accessToken"])')"

python3 -c 'import base64,json,sys; p=sys.argv[1].split(".")[1]; p += "="*((4-len(p)%4)%4); c=json.loads(base64.urlsafe_b64decode(p)); assert c["tenantId"] == 1; assert c["roles"] == ["USER"]' "$token"

# Use Python for expected HTTP errors so runner curl wrappers cannot turn a valid
# 4xx response into a shell failure. The HTTP status remains the assertion target.
http_error_request() {
  local url="$1"
  local tenant_id="$2"
  local output_file="$3"
  local model="$4"
  python3 - "$url" "$token" "$tenant_id" "$output_file" "$model" <<'PY'
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

url, token, tenant_id, output_file, model = sys.argv[1:]
body = ('{"model":"' + model + '","messages":[{"role":"user","content":"hello"}]}').encode()
request = Request(url, data=body, method="POST", headers={
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token,
    "X-Tenant-Id": tenant_id,
})
try:
    with urlopen(request, timeout=20) as response:
        status = response.status
        payload = response.read()
except HTTPError as exc:
    status = exc.code
    payload = exc.read()
Path(output_file).write_bytes(payload)
print(status)
PY
}

tenant_mismatch_code="$(http_error_request "$BASE_URL/api/v1/ai/chat" "2" "tenant-mismatch.txt" "gpt-ci-smoke")"
test "$tenant_mismatch_code" = "403"
cat tenant-mismatch.txt

response="$(curl -fsS -X POST "$BASE_URL/api/v1/ai/chat" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -H 'X-Tenant-Id: 1' \
  -d '{"model":"gpt-ci-smoke","messages":[{"role":"user","content":"hello"}]}')"
echo "$response"
printf '%s' "$response" | grep -q 'CI chat smoke test passed'

stream_code="$(curl --max-time 20 -sS -N -o stream-response.txt -w '%{http_code}' -X POST "$BASE_URL/api/v1/ai/chat/stream" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -H 'X-Tenant-Id: 1' \
  -d '{"model":"gpt-ci-smoke","messages":[{"role":"user","content":"hello"}]}')"
test "$stream_code" = "200"
cat stream-response.txt
grep -q 'CI stream ' stream-response.txt
grep -q 'smoke test passed' stream-response.txt
grep -q '"type":"delta"' stream-response.txt
grep -q '"type":"done"' stream-response.txt

unsupported_code="$(http_error_request "$BASE_URL/api/v1/ai/chat" "1" "unsupported-response.txt" "unsupported-ci-model")"
case "$unsupported_code" in
  4*|5*) ;;
  *) echo "Expected error status for unsupported model, got $unsupported_code"; cat unsupported-response.txt; exit 1 ;;
esac
cat unsupported-response.txt
