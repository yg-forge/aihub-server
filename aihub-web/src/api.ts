const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://aihub-server-jipl.onrender.com');

export type LoginResponse = {
  token?: string;
  accessToken?: string;
  tenantId?: number | string;
  data?: { token?: string; accessToken?: string; tenantId?: number | string };
  [key: string]: unknown;
};
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type Conversation = { id: number; title: string; model: string };
export type ModelInfo = { model: string; provider: string; enabled: boolean };
export type StreamUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number };

function authHeaders() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = localStorage.getItem('aihub_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const tenant = localStorage.getItem('aihub_tenant_id');
  if (tenant) headers.set('X-Tenant-Id', tenant);
  return headers;
}

function clearAuth() {
  localStorage.removeItem('aihub_token');
  localStorage.removeItem('aihub_tenant_id');
}

async function readError(response: Response) {
  const body = await response.json().catch(() => null);
  if (response.status === 401) {
    clearAuth();
    return '登录已过期，请重新登录';
  }
  if (response.status === 403) return body?.message || '没有权限访问该资源';
  if (response.status === 429) return body?.message || '请求过于频繁，请稍后重试';
  return body?.message || `Request failed: ${response.status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: authHeaders() });
  if (!response.ok) throw new Error(await readError(response));
  const body = await response.json().catch(() => null);
  return body as T;
}

export function login(username: string, password: string) {
  return request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function listModels(): Promise<ModelInfo[]> {
  const body = await request<unknown>('/api/v1/models');
  const value = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const row = item as Record<string, unknown>;
    return { model: String(row.model || ''), provider: String(row.provider || ''), enabled: row.enabled !== false };
  }).filter(row => row.model && row.enabled);
}

export async function listConversations(): Promise<Conversation[]> {
  const body = await request<unknown>('/api/v1/conversations');
  const value = body && typeof body === 'object' && 'data' in body ? (body as { data: unknown }).data : body;
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return { id: Number(row.id), title: String(row.title || 'New conversation'), model: String(row.model || '') };
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
    conversation: { id: Number(root.id ?? id), title: String(root.title || 'Conversation'), model: String(root.model || '') },
    messages
  };
}

export function createConversation(model: string, title?: string) {
  return request<{ data: Conversation }>('/api/v1/conversations', { method: 'POST', body: JSON.stringify({ model, title }) }).then(x => x.data);
}

export function renameConversation(id: number, title: string) {
  return request<{ data: Conversation }>(`/api/v1/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title })
  }).then(x => x.data);
}

export async function deleteConversation(id: number) {
  await request<unknown>(`/api/v1/conversations/${id}`, { method: 'DELETE' });
}

export async function streamConversation(
  id: number,
  model: string,
  content: string,
  onDelta: (delta: string) => void,
  onUsage?: (usage: StreamUsage) => void,
  signal?: AbortSignal
) {
  const response = await fetch(`${API_BASE}/api/v1/conversations/${id}/messages/stream`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ model, content }), signal
  });
  if (!response.ok || !response.body) {
    throw new Error(response.ok ? 'Streaming response body is unavailable' : await readError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    const raw = line.trim();
    if (!raw.startsWith('data:')) return;
    const data = raw.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const event = JSON.parse(data) as { type?: unknown; delta?: unknown; content?: unknown; usage?: StreamUsage };
      if (event.type === 'error') throw new Error(typeof event.content === 'string' ? event.content : 'AI provider error');
      if (event.usage && onUsage) onUsage(event.usage);
      const delta = typeof event.delta === 'string' ? event.delta : typeof event.content === 'string' && event.type !== 'error' ? event.content : '';
      if (delta) onDelta(delta);
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unexpected end of JSON input') throw error;
      // Ignore incomplete/non-JSON SSE payloads; the next chunk may complete the event.
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handleLine);
    if (done) {
      if (buffer.trim()) handleLine(buffer);
      break;
    }
  }
}
