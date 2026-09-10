// API client for the Hostinger PHP backend (same-origin /api)

const API_BASE = '/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('apiToken');
  const res = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON (e.g. hosting error page) */ }
  if (!res.ok) {
    throw new Error(data?.error || `Server error (${res.status})`);
  }
  return data;
}

export function apiLogin(username, password) {
  return apiFetch('login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function apiChangePassword(current, next) {
  return apiFetch('change-password', {
    method: 'POST',
    body: JSON.stringify({ current, new: next }),
  });
}

export async function apiAvailable() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    const data = await res.json();
    return data?.status === 'ok';
  } catch {
    return false;
  }
}
