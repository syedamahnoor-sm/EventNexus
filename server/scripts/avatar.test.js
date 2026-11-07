const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { processAvatar, MAX_PHOTO_BYTES } = require('../src/services/avatarImages');
const { createAvatarStorage, storageConfigured, signature } = require('../src/services/avatarStorage');
const publicUser = require('../src/utils/publicUser');
const User = require('../src/models/User');
const { updateProfileSchema } = require('../src/validators/profileValidation');

test('actual JPEG, PNG and WebP bytes decode to square, stripped WebP avatars', async () => {
  for (const [format, type] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#b8cdb6' } }).withMetadata({ orientation: 6 }).toFormat(format).toBuffer();
    const output = await processAvatar(input, type);
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, 'webp'); assert.equal(meta.width, 512); assert.equal(meta.height, 512);
    assert.equal(meta.exif, undefined); assert.equal(meta.orientation, undefined);
  }
});
test('spoofed types, corrupt bytes, vector files, huge files and unsafe dimensions are refused', async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(processAvatar(png, 'image/jpeg'), error => error.status === 415);
  await assert.rejects(processAvatar(Buffer.from('not an image'), 'image/png'), error => error.status === 415);
  await assert.rejects(processAvatar(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('invalid PNG')]), 'image/png'), error => error.status === 422);
  await assert.rejects(processAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'), 'image/png'), error => error.status === 415);
  await assert.rejects(processAvatar(Buffer.alloc(MAX_PHOTO_BYTES + 1), 'image/png'), error => error.status === 413);
  const wide = await sharp({ create: { width: 9000, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(processAvatar(wide, 'image/png'), error => error.status === 413);
});
test('unconfigured storage stays disabled and signatures match canonical sorted SHA-256', () => {
  assert.equal(storageConfigured({}), false); assert.equal(createAvatarStorage({}), null);
  assert.equal(signature({ timestamp: 1, public_id: 'owned' }, 'test-secret'), crypto.createHash('sha256').update('public_id=owned&timestamp=1test-secret').digest('hex'));
});
test('animated WebP is rejected and concurrent decoding is bounded', async () => {
  const frames = Buffer.alloc(24);
  for (let i = 0; i < 4; i++) { frames[i * 3] = 255; frames[12 + i * 3 + 2] = 255; }
  const animated = await sharp(frames, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.ok((await sharp(animated).metadata()).pages > 1);
  await assert.rejects(processAvatar(animated, 'image/webp'), error => error.status === 415);
  const input = await sharp({ create: { width: 1200, height: 1000, channels: 3, background: 'white' } }).png().toBuffer();
  const results = await Promise.allSettled([0, 1, 2, 3].map(() => processAvatar(input, 'image/png')));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 2);
  assert.ok(results.filter(result => result.status === 'rejected').every(result => result.reason.status === 429));
});
test('Cloudinary adapter signs uploads/deletions and rejects untrusted responses/keys', async () => {
  const key = `eventnexus/student-avatars/${'a'.repeat(24)}/${crypto.randomUUID()}`;
  const env = { CLOUDINARY_CLOUD_NAME: 'test-cloud', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret' };
  let calls = 0;
  const store = createAvatarStorage(env, async (url, request) => {
    calls++;
    assert.ok(url.startsWith('https://api.cloudinary.com/v1_1/test-cloud/image/'));
    assert.equal(request.body.get('public_id'), key);
    const params = Object.fromEntries([...request.body.entries()].filter(([name]) => !['file', 'api_key', 'signature'].includes(name)));
    assert.equal(request.body.get('signature'), signature(params, env.CLOUDINARY_API_SECRET));
    return { ok: true, json: async () => url.endsWith('/upload') ? { public_id: key, secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v1/${key}.webp`, format: 'webp' } : { result: 'ok' } };
  });
  await store.upload(key, Buffer.from('processed test bytes')); await store.remove(key); assert.equal(calls, 2);
  await assert.rejects(store.remove('another-project/object'));
  const malicious = createAvatarStorage(env, async () => ({ ok: true, json: async () => ({ public_id: key, secure_url: 'https://untrusted.example/image.webp', format: 'webp' }) }));
  await assert.rejects(malicious.upload(key, Buffer.from('processed')));
});
test('photo reference remains optional, server-only keys do not serialize or permit mass assignment', async () => {
  const user = new User({ name: 'Photo Student', email: 'student@example.edu', password: 'hashed-password', role: 'student' });
  await user.validate(); assert.equal(publicUser(user).photoUrl, null);
  user.profilePhoto = { key: `eventnexus/student-avatars/${user._id}/${crypto.randomUUID()}`, url: 'https://res.cloudinary.com/test-cloud/image/upload/avatar.webp' };
  await user.validate(); const result = publicUser(user);
  assert.equal(result.photoUrl, user.profilePhoto.url); assert.equal(result.profilePhoto, undefined);
  assert.equal(updateProfileSchema.safeParse({ version: 0, profilePhoto: user.profilePhoto }).success, false);
});
