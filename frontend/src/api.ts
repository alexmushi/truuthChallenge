import { Submission, User } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'truuthAuthToken';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options: (RequestInit & { timeoutMs?: number }) = {}): Promise<T> {
  const { timeoutMs = 15000, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  const token = getToken();

  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...requestOptions,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(requestOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.headers || {})
      }
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Token fallback should not keep retrying with a stale/expired token.
    if (response.status === 401 && url !== '/api/session/login') {
      clearToken();
    }
    throw new ApiError(body?.message || 'Something went wrong. Please try again.', response.status);
  }

  return body;
}

export const api = {
  login: async (username: string, password: string) => {
    const response = await request<{ user: User; token?: string }>('/api/session/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (response.token) {
      setToken(response.token);
    }
    return { user: response.user };
  },
  logout: async () => {
    try {
      return await request<{ ok: boolean }>('/api/session/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },
  me: () => request<{ user: User }>('/api/session/me'),
  listDocuments: () => request<{ submissions: Submission[] }>('/api/documents'),
  uploadDocument: (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);
    return request<{ submission: Submission }>('/api/documents/upload', { method: 'POST', body: formData, timeoutMs: 70000 });
  },
  deleteDocument: (submissionId: number) => request<{ ok: boolean }>(`/api/documents/${submissionId}`, { method: 'DELETE' })
};
