// Frontend-owned static assets or explicit HTTPS images. No data/javascript/protocol-relative URLs.
function isEventImageUrl(value) {
  if (value === undefined || value === '') return true;
  if (typeof value !== 'string' || value.length > 2048 || /[\s\u0000-\u001f\\]/.test(value)) return false;
  if (/^\/images\/events\/[a-z0-9][a-z0-9-]*\.webp$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

module.exports = { isEventImageUrl };
