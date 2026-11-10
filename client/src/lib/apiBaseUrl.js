export function apiBaseUrl(value, development = false) {
  const configured = value?.trim();
  if (!configured && development) return 'http://localhost:5000/api';
  let url;
  try { url = new URL(configured); } catch { throw new Error('Set VITE_API_URL to the backend URL including /api.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '') !== '/api' || (!development && (url.protocol !== 'https:' || local))) {
    throw new Error('VITE_API_URL must end with /api once, without credentials, query or fragment; production requires a non-local HTTPS URL.');
  }
  return url.href.replace(/\/+$/, '');
}
