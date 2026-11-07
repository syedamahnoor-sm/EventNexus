// Tokens live only in memory. The HttpOnly session cookie remains owned by Express.
export function createAuthClient(api) {
  let token = null;
  let pending = null;
  function clear() { token = null; pending = null; }
  async function csrf() {
    if (token) return token;
    if (!pending) pending = api.get('/auth/csrf-token', { timeout: 10000 }).then(({ data }) => {
      if (!/^[a-f0-9]{64}$/.test(data.csrfToken)) throw new Error('Security token unavailable');
      token = data.csrfToken;
      return token;
    }).finally(() => { pending = null; });
    return pending;
  }
  async function post(path, body = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await api.post(path, body, { headers: { 'X-CSRF-Token': await csrf() }, timeout: 15000 });
        if (path === '/auth/login') token = response.data.csrfToken || null;
        if (path === '/auth/logout') clear();
        return response.data;
      } catch (error) {
        // This precise rejection happens before a controller executes. Never retry an
        // ambiguous network failure or a general permission/validation failure.
        if (attempt === 0 && error.response?.status === 403 && error.response.data?.message === 'Invalid or missing CSRF token') {
          clear();
          continue;
        }
        throw error;
      }
    }
  }
  return { post, clear };
}
