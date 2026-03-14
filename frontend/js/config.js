window.COREINVENTORY_API_BASE = 'https://coreinventory-bjqx.onrender.com';

function apiUrl(path) {
  const base = window.COREINVENTORY_API_BASE || '';
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
