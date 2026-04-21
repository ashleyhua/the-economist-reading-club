const BASE = import.meta.env.VITE_API_BASE || '/api';

// Backend base URL (without /api) — used for resolving /uploads/ paths
export const BACKEND_BASE = BASE.replace(/\/api$/, '');

// Resolve a relative /uploads/... URL to a full URL when deployed
export function resolveUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_BASE}${url}`;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('wenjing_token');
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

export default api;