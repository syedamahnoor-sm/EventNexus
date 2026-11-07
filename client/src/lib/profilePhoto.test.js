import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoSelectionError, MAX_PHOTO_BYTES } from './profilePhoto.js';
import { createAuthClient } from '../auth/authClient.js';
test('selection permits JPEG/PNG/WebP within the size bound and refuses unknown/empty/oversize files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(photoSelectionError({ type, size: 100 }), null);
  for (const file of [{ type: 'image/svg+xml', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: MAX_PHOTO_BYTES + 1 }]) assert.ok(photoSelectionError(file));
});
test('binary upload keeps credentials client, CSRF, version and content type options; retries only CSRF rejection', async () => {
  let writes = 0;
  const file = new Blob(['binary'], { type: 'image/png' });
  const client = createAuthClient({ get: async () => ({ data: { csrfToken: 'a'.repeat(64) } }), post: async (path, body, config) => {
    assert.equal(path, '/students/profile/photo'); assert.equal(body, file);
    assert.equal(config.headers['Content-Type'], 'image/png'); assert.equal(config.headers['X-Profile-Version'], '4');
    assert.equal(config.headers['X-CSRF-Token'].length, 64); assert.equal(config.timeout, 60000);
    if (++writes === 1) throw { response: { status: 403, data: { message: 'Invalid or missing CSRF token' } } };
    return { data: { message: 'saved' } };
  } });
  await client.post('/students/profile/photo', file, { headers: { 'Content-Type': 'image/png', 'X-Profile-Version': '4' }, timeout: 60000 });
  assert.equal(writes, 2);
});
