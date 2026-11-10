const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('startup honors configured ports and refuses invalid port numbers', () => {
    const root = path.resolve(__dirname, '..');
    const script = `
      function stub(id, value) { require.cache[require.resolve(id)] = { exports: value }; }
      stub('dotenv', { config() {} });
      stub('./src/config/db', async () => {});
      stub('./src/app', { listen(port, done) { console.log('LISTEN=' + port); done(); } });
      require('./index');
    `;
    for (const [port, expected] of [['', 5000], ['5178', 5178], ['80', 80]]) {
        const result = spawnSync(process.execPath, ['-e', script], { cwd: root, env: { ...process.env, PORT: port }, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        assert.ok(result.stdout.includes('LISTEN=' + expected));
    }
    for (const port of ['abc', '-1', '65536', '5000.5']) {
        const result = spawnSync(process.execPath, ['-e', script], { cwd: root, env: { ...process.env, PORT: port }, encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.ok(!result.stdout.includes('LISTEN='));
    }
});

test('session reads remain available while auth writes stay limited; API responses cannot be cached', async () => {
    // Exercise the real HTTP middleware with an isolated memory store, never MongoDB or .env.
    const session = require('express-session');
    const sessionPath = require.resolve('../src/config/session');
    const previous = require.cache[sessionPath];
    require.cache[sessionPath] = { exports: () => session({ secret: 'isolated-security-test-secret', resave: false, saveUninitialized: false }) };
    const app = require('../src/app');
    if (previous) require.cache[sessionPath] = previous;
    else delete require.cache[sessionPath];
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    try {
        let cookie, csrf;
        for (let i = 0; i < 25; i++) {
            const response = await fetch(base + '/api/auth/csrf-token', { headers: cookie ? { Cookie: cookie } : {} });
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            cookie = response.headers.getSetCookie()[0]?.split(';')[0] || cookie;
            csrf = (await response.json()).csrfToken;
        }
        for (const route of ['/api/registrations/me', '/api/events/000000000000000000000001/registration']) {
            const response = await fetch(base + route);
            assert.equal(response.status, 401);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            await response.arrayBuffer();
        }
        const recap = await fetch(base + '/api/events/000000000000000000000001/recap', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recap: 'é'.repeat(9000) }) });
        assert.equal(recap.status, 403); // Valid size reaches CSRF, rather than an incorrect 413.
        await recap.arrayBuffer();
        const oversized = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ padding: 'x'.repeat(11000) }) });
        assert.equal(oversized.status, 413); await oversized.arrayBuffer();
        const malformed = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
        assert.equal(malformed.status, 400); await malformed.arrayBuffer();
        for (const query of ['?search%5B%24ne%5D=x', '?page=1&page=2', '?unsupported=value']) {
            const response = await fetch(base + '/api/events' + query);
            assert.equal(response.status, 400); await response.arrayBuffer();
        }
        for (let i = 0; i < 21; i++) {
            const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, body: '{}' });
            assert.equal(response.status, i < 20 ? 400 : 429);
            await response.arrayBuffer();
        }
        const response = await fetch(base + '/api/auth/csrf-token', { headers: { Cookie: cookie } });
        assert.equal(response.status, 200);
        await response.arrayBuffer();
    } finally {
        server.closeIdleConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
