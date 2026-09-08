#!/usr/bin/env python3
import base64
import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
MODEL = os.environ.get("AI_PROVIDER_MODEL", "gpt-4o-mini")
PASSWORD = "CiTestPassword123!"


def request(path, body=None, token=None, tenant_id=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if tenant_id is not None:
        headers["X-Tenant-Id"] = str(tenant_id)
    req = urllib.request.Request(BASE_URL + path, data=data, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


body = {"model": MODEL, "messages": [{"role": "user", "content": "hello"}]}

status, _ = request("/api/v1/ai/chat", body)
print(f"Unauthenticated chat: HTTP {status}")
if status not in (401, 403):
    fail(f"Expected 401/403 for unauthenticated chat, got {status}")

status, payload = request("/api/v1/auth/register", {"username": "ci-user", "password": PASSWORD})
print(payload.decode(errors="replace"))
if status < 200 or status >= 300:
    fail(f"Registration failed with HTTP {status}")
registration = json.loads(payload)
if registration.get("data", {}).get("role") != "USER":
    fail("Public registration must create USER")
if registration.get("data", {}).get("role") == "SUPER_ADMIN":
    fail("Public registration must not create SUPER_ADMIN")

status, payload = request("/api/v1/auth/login", {"username": "ci-user", "password": PASSWORD})
if status < 200 or status >= 300:
    fail(f"Login failed with HTTP {status}")
login = json.loads(payload)
token = login["data"]["accessToken"]
print('{"success":true,"data":{"accessToken":"***"},"message":null}')

parts = token.split(".")
if len(parts) != 3:
    fail("JWT does not have three segments")
encoded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
claims = json.loads(base64.urlsafe_b64decode(encoded))
if claims.get("tenantId") != 1:
    fail(f"Expected JWT tenantId=1, got {claims.get('tenantId')}")
if claims.get("roles") != ["USER"]:
    fail(f"Expected JWT roles=['USER'], got {claims.get('roles')}")
print("JWT claims: tenantId=1 roles=['USER']")

status, payload = request("/api/v1/ai/chat", body, token, 2)
print(f"Tenant mismatch: HTTP {status}")
print(payload.decode(errors="replace"))
if status != 403:
    fail(f"Expected HTTP 403 for tenant mismatch, got {status}")

status, payload = request("/api/v1/ai/chat", body, token, 1)
print(f"Authorized chat: HTTP {status}")
print(payload.decode(errors="replace"))
if status != 200:
    fail(f"Expected HTTP 200 for authorized chat, got {status}")
if b"CI chat smoke test passed" not in payload:
    fail("Authorized chat response did not contain smoke-test success marker")

status, payload = request("/api/v1/ai/chat/stream", body, token, 1)
print(f"Stream: HTTP {status}")
print(payload.decode(errors="replace"))
if status != 200:
    fail(f"Expected HTTP 200 for stream, got {status}")
text = payload.decode(errors="replace")
for marker in ("CI stream ", "smoke test passed", '"type":"delta"', '"type":"done"'):
    if marker not in text:
        fail(f"Stream response missing marker: {marker}")

unsupported = {"model": "unsupported-ci-model", "messages": [{"role": "user", "content": "hello"}]}
status, payload = request("/api/v1/ai/chat", unsupported, token, 1)
print(f"Unsupported model: HTTP {status}")
print(payload.decode(errors="replace"))
if not (400 <= status < 600):
    fail(f"Expected 4xx/5xx for unsupported model, got {status}")

print("CI smoke test passed")
