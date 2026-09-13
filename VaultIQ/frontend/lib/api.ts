const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

export function getAuthToken() {
  return authToken;
}

async function request<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  let data: any;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message = data?.message ?? data ?? `HTTP ${res.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
  }

  return data as T;
}

export const apiFetch = request;

// -------------------------------------------------------------------------
// Auth
// -------------------------------------------------------------------------

export const authApi = {
  register: (email: string, fullName: string, masterPassword: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, fullName, masterPassword }),
    }),

  login: (email: string, masterPassword: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, masterPassword }),
    }),

  refresh: (refresh_token: string) =>
    request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),
};

// -------------------------------------------------------------------------
// Vault Entries
// -------------------------------------------------------------------------

export const vaultApi = {
  getEntries: (params?: {
    type?: string;
    collectionId?: string;
    tagId?: string;
    favorite?: boolean;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.collectionId) q.set('collectionId', params.collectionId);
    if (params?.tagId) q.set('tagId', params.tagId);
    if (params?.favorite) q.set('favorite', 'true');
    if (params?.search) q.set('search', params.search);
    return request(`/vault?${q.toString()}`);
  },

  getEntry: (id: string) => request(`/vault/${id}`),

  createEntry: (data: Record<string, any>) =>
    request('/vault', { method: 'POST', body: JSON.stringify(data) }),

  updateEntry: (id: string, data: Record<string, any>) =>
    request(`/vault/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEntry: (id: string) =>
    request(`/vault/${id}`, { method: 'DELETE' }),

  getSecurityScore: () => request('/vault/score'),

  getAuditLog: (limit?: number) =>
    request(`/vault/audit${limit ? `?limit=${limit}` : ''}`),

  // Collections
  getCollections: () => request('/vault/collections/list'),

  createCollection: (data: { name: string; icon?: string; color?: string }) =>
    request('/vault/collections', { method: 'POST', body: JSON.stringify(data) }),

  deleteCollection: (id: string) =>
    request(`/vault/collections/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => request('/vault/tags/list'),

  createTag: (data: { name: string; color?: string }) =>
    request('/vault/tags', { method: 'POST', body: JSON.stringify(data) }),
};
