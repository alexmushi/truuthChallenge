import { Submission, User } from './types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.message || 'Something went wrong. Please try again.');
  }

  return body;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),
  listDocuments: () => request<{ submissions: Submission[] }>('/api/documents'),
  uploadDocument: (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);
    return request<{ submission: Submission }>('/api/documents/upload', { method: 'POST', body: formData });
  },
  getResult: (submissionId: number) => request<{ resultJson: unknown }>(`/api/documents/${submissionId}/result`)
};
