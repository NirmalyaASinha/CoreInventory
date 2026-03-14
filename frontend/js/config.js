window.COREINVENTORY_API_BASE = 'http://127.0.0.1:5000';

function apiUrl(path) {
  const base = window.COREINVENTORY_API_BASE || '';
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
