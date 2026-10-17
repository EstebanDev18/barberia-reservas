const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
}

// Una sesión por barbería: el token de una no sirve en el panel de otra.
export const tokenKey = (slug) => `barberos_admin_${slug}`;

export function adminApi(slug, path, options = {}) {
  const token = typeof window === 'undefined' ? '' : window.localStorage.getItem(tokenKey(slug));
  return api(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
}
