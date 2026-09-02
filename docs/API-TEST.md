# API Test

## Register
POST `/api/v1/auth/register`
```json
{"username":"admin","password":"ChangeMe123!"}
```

## Login
POST `/api/v1/auth/login`

Copy `accessToken`.

## Chat
POST `/api/v1/ai/chat`
Headers:
- Authorization: Bearer TOKEN
- X-Tenant-Id: 1

```json
{
  "model":"openai:gpt-4.1",
  "messages":[{"role":"user","content":"Hello AIHub"}],
  "temperature":0.7
}
```

## SSE
POST `/api/v1/ai/chat/stream`
Use the same JSON body and add `Accept: text/event-stream`.
