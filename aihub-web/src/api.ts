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

export async function listConversations(): Promise<Conversation[]> {
  const body = await request<unknown>('/api/v1/conversations');
  const value = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return { id: Number(row.id), title: String(row.title || 'New conversation'), model: String(row.model || 'gpt-4o-mini') };
  }).filter((row) => Number.isFinite(row.id));
}

export async function getConversation(id: number): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
  const body = await request<unknown>(`/api/v1/conversations/${id}`);
  const root = (body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body) as Record<string, unknown>;
  const rawMessages = Array.isArray(root.messages) ? root.messages : [];
  const messages = rawMessages.map((item) => {
    const row = item as Record<string, unknown>;
    const role = row.role === 'assistant' || row.role === 'user' ? row.role : 'assistant';
    return { role, content: String(row.content || '') } as ChatMessage;
  });
  return {
    conversation: { id: Number(root.id ?? id), title: String(root.title || 'Conversation'), model: String(root.model || 'gpt-4o-mini') },
    messages
  };
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
