const test = require('node:test');
const assert = require('node:assert/strict');
const { clientOrigin, proxyHops, sessionCookieOptions } = require('../src/config/deployment');

test('production configuration requires an exact HTTPS frontend origin and bounded proxy trust', () => {
    assert.equal(clientOrigin({}), 'http://localhost:5173');
    const env = { NODE_ENV: 'production', CLIENT_URL: 'https://event-nexus-one.vercel.app' };
    assert.equal(clientOrigin(env), env.CLIENT_URL);
    for (const CLIENT_URL of ['', 'https://event-nexus-one.vercel.app/', 'http://example.com', 'https://example.com/path', '*']) assert.throws(() => clientOrigin({ ...env, CLIENT_URL }));
    assert.equal(proxyHops({}), 0); assert.equal(proxyHops({ TRUST_PROXY_HOPS: '1' }), 1);
    for (const TRUST_PROXY_HOPS of ['true', '-1', '1.5', '100']) assert.throws(() => proxyHops({ TRUST_PROXY_HOPS }));
    assert.equal(sessionCookieOptions(env).sameSite, 'none');
    assert.equal(sessionCookieOptions(env).secure, true);
    assert.equal(sessionCookieOptions({}).sameSite, 'lax');
});

test('Render HTTPS proxy issues cross-site cookies; CORS, CSRF and logout work without MongoDB', async t => {
    const names = ['NODE_ENV', 'CLIENT_URL', 'TRUST_PROXY_HOPS', 'SESSION_SECRET'];
    const saved = Object.fromEntries(names.map(key => [key, process.env[key]]));
    t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
    Object.assign(process.env, { NODE_ENV: 'production', CLIENT_URL: 'https://event-nexus-one.vercel.app', TRUST_PROXY_HOPS: '1', SESSION_SECRET: 'isolated-production-configuration-test' });
    const { MemoryStore } = require('express-session');
    const MongoStore = require('connect-mongo').default;
    t.mock.method(MongoStore, 'create', () => new MemoryStore());
    const app = require('../src/app');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const headers = { Origin: process.env.CLIENT_URL, 'X-Forwarded-Proto': 'https' };
    try {
        const preflight = await fetch(base + '/api/auth/logout', { method: 'OPTIONS', headers: { ...headers, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token' } });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('access-control-allow-origin'), headers.Origin);
        assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
        assert.match(preflight.headers.get('access-control-allow-headers'), /x-csrf-token/i);
        const tokenResponse = await fetch(base + '/api/auth/csrf-token', { headers });
        assert.equal(tokenResponse.status, 200);
        const setCookie = tokenResponse.headers.getSetCookie()[0];
        for (const flag of ['HttpOnly', 'Secure', 'SameSite=None', 'Path=/']) assert.ok(setCookie.includes(flag));
        const cookie = setCookie.split(';')[0], token = (await tokenResponse.json()).csrfToken;
        assert.match(token, /^[a-f0-9]{64}$/);
        const me = await fetch(base + '/api/auth/me', { headers: { ...headers, Cookie: cookie } });
        assert.equal(me.status, 401); await me.arrayBuffer(); // Correct route, anonymous session; no user query.
        const blocked = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { ...headers, Cookie: cookie } });
        assert.equal(blocked.status, 403); await blocked.arrayBuffer();
        const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { ...headers, Cookie: cookie, 'X-CSRF-Token': token } });
        assert.equal(logout.status, 200); await logout.arrayBuffer();
        assert.match(logout.headers.getSetCookie()[0], /SameSite=None/);
        assert.match(logout.headers.getSetCookie()[0], /Secure/);
        const stale = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { ...headers, Cookie: cookie, 'X-CSRF-Token': token } });
        assert.equal(stale.status, 403); await stale.arrayBuffer();
        const other = await fetch(base + '/api/auth/me', { headers: { ...headers, Origin: 'https://other.vercel.app' } });
        assert.notEqual(other.headers.get('access-control-allow-origin'), 'https://other.vercel.app'); await other.arrayBuffer();
        app.set('trust proxy', 0);
        const untrusted = await fetch(base + '/api/auth/csrf-token', { headers });
        assert.equal(untrusted.headers.getSetCookie().length, 0); await untrusted.arrayBuffer();
    } finally {
        server.closeIdleConnections(); await new Promise(resolve => server.close(resolve));
    }
});
