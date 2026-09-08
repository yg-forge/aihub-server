const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export type LoginResponse = { token?: string; accessToken?: string; [key: string]: unknown };
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type Conversation = { id: number; title: string; model: string };

function authHeaders() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = localStorage.getItem('aihub_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const tenant = localStorage.getItem('aihub_tenant_id');
  if (tenant) headers.set('X-Tenant-Id', tenant);
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: authHeaders() });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`);
  return body as T;
}

export function login(username: string, password: string) {
  return request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function createConversation(model: string, title?: string) {
  return request<{ data: Conversation }>('/api/v1/conversations', { method: 'POST', body: JSON.stringify({ model, title }) }).then(x => x.data);
}

export async function streamConversation(id: number, model: string, content: string, onDelta: (delta: string) => void) {
  const response = await fetch(`${API_BASE}/api/v1/conversations/${id}/messages/stream`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ model, content })
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Streaming request failed: ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) {
      const raw = line.trim();
      if (!raw.startsWith('data:')) continue;
      const data = raw.slice(5).trim();
      if (!data) continue;
      try { const event = JSON.parse(data); if (event.delta) onDelta(event.delta); }
      catch { /* Spring may emit raw JSON chunks depending on codec */ }
    }
    if (done) break;
  }
}
