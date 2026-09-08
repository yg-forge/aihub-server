const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export type LoginResponse = { token?: string; accessToken?: string; [key: string]: unknown };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aihub_token');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const tenant = localStorage.getItem('aihub_tenant_id');
  if (tenant) headers.set('X-Tenant-Id', tenant);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`);
  return body as T;
}

export function login(username: string, password: string) {
  return request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}
export function chat(message: string) {
  return request<{ data?: unknown; message?: string }>('/api/v1/chat', { method: 'POST', body: JSON.stringify({ message }) });
}
