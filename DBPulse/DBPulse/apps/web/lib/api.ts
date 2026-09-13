// Centralized API client — attaches JWT to every request

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dbpulse_token');
}

export function setToken(token: string) {
  localStorage.setItem('dbpulse_token', token);
}

export function clearToken() {
  localStorage.removeItem('dbpulse_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? 'API error');
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  signIn: (email: string, password: string) =>
    request<{ accessToken: string; expiresIn: number }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Connections
  listConnections: () => request<any[]>('/connections'),
  createConnection: (data: any) =>
    request<any>('/connections', { method: 'POST', body: JSON.stringify(data) }),
  connectDb: (id: string) =>
    request<any>(`/connections/${id}/connect`, { method: 'POST' }),
  disconnectDb: (id: string) =>
    request<any>(`/connections/${id}/connect`, { method: 'DELETE' }),

  // Events
  getEvents: (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) q.set(k, String(v));
    }
    return request<{ data: any[]; total: number }>(`/events?${q}`);
  },
  getEvent: (id: string) => request<any>(`/events/${id}`),
  getEventStats: (connectionId: string) =>
    request<any>(`/events/stats/${connectionId}`),

  // Alert Rules
  listAlertRules: (connectionId?: string) =>
    request<any[]>(`/alert-rules${connectionId ? `?connectionId=${connectionId}` : ''}`),
  createAlertRule: (data: any) =>
    request<any>('/alert-rules', { method: 'POST', body: JSON.stringify(data) }),
  updateAlertRule: (id: string, data: any) =>
    request<any>(`/alert-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAlertRule: (id: string) =>
    request<any>(`/alert-rules/${id}`, { method: 'DELETE' }),

  // Health
  getHealth: () => request<any>('/health'),
  getConnectionHealth: (id: string) => request<any>(`/health/connections/${id}`),

  // Triggers
  installTriggers: (id: string, data: any) =>
    request<any>(`/connections/${id}/postgres/install-triggers`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  listTriggers: (id: string, schemas = 'public') =>
    request<any[]>(`/connections/${id}/postgres/triggers?schemas=${schemas}`),
};
