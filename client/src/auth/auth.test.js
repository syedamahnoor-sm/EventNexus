import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authDestination, authFeedback, validateAuth } from './authRules.js';
import { createAuthClient } from './authClient.js';

test('registration validates names, email, confirmation and bcrypt UTF-8 byte limit', () => {
  const good = { name: 'Campus Student', email: 'student@example.edu', password: 'a good passphrase', confirm: 'a good passphrase' };
  assert.deepEqual(validateAuth(good, true), {});
  assert.ok(validateAuth({ ...good, password: 'é'.repeat(37) }, true).password);
  assert.equal(validateAuth({ ...good, password: 'é'.repeat(36), confirm: 'é'.repeat(36) }, true).password, undefined);
  assert.ok(validateAuth({ ...good, confirm: 'different' }, true).confirm);
  assert.ok(validateAuth({ ...good, name: ' ' }, true).name);
  assert.ok(validateAuth({ ...good, email: 'not an email' }).email);
  assert.deepEqual(validateAuth({ ...good, password: 'x' }), {}); // Login accepts existing credentials, not signup rules.
});

test('return destinations preserve known routes and role, reject external/looping paths', () => {
  for (const bad of ['https://example.com', '//example.com', '/login', '/register', '/events/../login', '/events\\evil', '/events\n']) assert.equal(authDestination(bad, 'student'), '/events');
  assert.equal(authDestination('/student/dashboard', 'organizer'), '/events');
  assert.equal(authDestination('/organizer/dashboard', 'organizer'), '/organizer/dashboard');
  assert.equal(authDestination('/events/past?category=Career', 'student'), '/events/past?category=Career');
  assert.equal(authDestination({ pathname: '/events', search: '?page=2' }), '/events?page=2');
});

test('network, invalid credentials, duplicate email and rate limits remain distinct', () => {
  assert.match(authFeedback({}, 'login').message, /connection/);
  assert.match(authFeedback({}, 'register').message, /couldn’t confirm account creation/);
  assert.match(authFeedback({ response: { status: 401 } }, 'login').message, /don’t match/);
  assert.ok(authFeedback({ response: { status: 409 } }, 'register').fields.email);
  assert.match(authFeedback({ response: { status: 429 } }).message, /Too many/);
});

test('CSRF issuance is shared, login rotates token, logout clears it', async () => {
  let gets = 0;
  const seen = [];
  const api = { get: async () => { gets++; return { data: { csrfToken: 'a'.repeat(64) } }; }, post: async (path, body, config) => { seen.push(config.headers['X-CSRF-Token']); return { data: path === '/auth/login' ? { csrfToken: 'b'.repeat(64) } : {} }; } };
  const client = createAuthClient(api);
  await Promise.all([client.post('/auth/register'), client.post('/auth/register')]);
  assert.equal(gets, 1);
  await client.post('/auth/login');
  await client.post('/auth/logout');
  assert.equal(seen.at(-1), 'b'.repeat(64));
  await client.post('/auth/register');
  assert.equal(gets, 2);
});

test('only an explicit CSRF rejection is retried once; ambiguous writes never retry', async () => {
  let gets = 0, posts = 0;
  const rejection = { response: { status: 403, data: { message: 'Invalid or missing CSRF token' } } };
  const client = createAuthClient({ get: async () => { gets++; return { data: { csrfToken: 'a'.repeat(64) } }; }, post: async () => { posts++; throw rejection; } });
  await assert.rejects(client.post('/auth/register'));
  assert.equal(posts, 2); assert.equal(gets, 2);
  for (const failure of [new Error('Network Error'), { response: { status: 403, data: { message: 'Forbidden' } } }, { response: { status: 500 } }]) {
    let writes = 0;
    const transport = createAuthClient({ get: async () => ({ data: { csrfToken: 'c'.repeat(64) } }), post: async () => { writes++; throw failure; } });
    await assert.rejects(transport.post('/auth/login')); assert.equal(writes, 1);
  }
});
