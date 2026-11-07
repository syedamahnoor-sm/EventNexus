import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canCancelRegistration } from './cancellation.js';
import { createAuthClient } from '../auth/authClient.js';

test('only active records for future upcoming events permit cancellation, regardless of seats', () => {
  const now = Date.now(), record = { _id: 'real-reference' };
  assert.equal(canCancelRegistration({ status: 'upcoming', date: new Date(now + 1000), capacity: 1, registeredCount: 1 }, record, now), true);
  for (const status of ['cancelled', 'completed', 'unknown']) assert.equal(canCancelRegistration({ status, date: new Date(now + 1000) }, record, now), false);
  for (const date of [new Date(now), new Date(now - 1), 'invalid']) assert.equal(canCancelRegistration({ status: 'upcoming', date }, record, now), false);
  assert.equal(canCancelRegistration({ status: 'upcoming', date: new Date(now + 1) }, null, now), false);
});
test('DELETE sends the captured record reference with CSRF and retries only token rejection', async () => {
  let tokens = 0, deletes = 0;
  const client = createAuthClient({ get: async () => ({ data: { csrfToken: String(++tokens).repeat(64) } }), delete: async (path, config) => {
    deletes++;
    assert.equal(path, '/events/id/register'); assert.deepEqual(config.data, { registrationId: 'captured' });
    assert.equal(config.headers['X-CSRF-Token'].length, 64);
    if (deletes === 1) throw { response: { status: 403, data: { message: 'Invalid or missing CSRF token' } } };
    return { data: { message: 'Registration cancelled successfully' } };
  } });
  await client.delete('/events/id/register', { registrationId: 'captured' });
  assert.equal(deletes, 2); assert.equal(tokens, 2);
});
test('uncertain DELETE never silently retries', async () => {
  let writes = 0;
  const client = createAuthClient({ get: async () => ({ data: { csrfToken: 'a'.repeat(64) } }), delete: async () => { writes++; throw new Error('Network failure'); } });
  await assert.rejects(client.delete('/events/id/register', {})); assert.equal(writes, 1);
});
