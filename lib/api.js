const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
}

export function adminApi(path, options = {}) {
  const token = typeof window === 'undefined' ? '' : window.localStorage.getItem('barberia_admin_token');
  return api(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
}
