const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Event = require('../../src/models/Event');
const Registration = require('../../src/models/Registration');
const { createEventSchema, updateEventSchema } = require('../../src/validators/eventValidator');
const { isEventImageUrl } = require('../../src/validators/imageUrl');
const photos = require('./photos.json');
const { validatePhotoAssets } = require('./photo-assets');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { CATALOG, MARKER, DISTRIBUTION, buildCatalog } = require('./catalog');
const { assertDevelopment, SeedSafetyError } = require('./safety');

const development = {
  NODE_ENV: 'development', MONGO_URI: 'mongodb://localhost:27017/eventnexus_dev',
  EVENTNEXUS_SEED_ALLOW: 'development-only', EVENTNEXUS_SEED_DB: 'eventnexus_dev',
};

test('production, unset, test and staging NODE_ENV cannot seed even with opt-in', () => {
  for (const NODE_ENV of ['production', undefined, 'test', 'staging', 'Development']) {
    assert.throws(() => assertDevelopment({ ...development, NODE_ENV }), SeedSafetyError);
  }
  assert.throws(() => assertDevelopment({ ...development, APP_ENV: 'production' }), SeedSafetyError);
});

test('development requires both explicit opt-in and exact database confirmation', () => {
  assert.equal(assertDevelopment(development), 'eventnexus_dev');
  for (const update of [{ EVENTNEXUS_SEED_ALLOW: undefined }, { EVENTNEXUS_SEED_DB: undefined }, { EVENTNEXUS_SEED_DB: 'another_db' }]) {
    assert.throws(() => assertDevelopment({ ...development, ...update }), SeedSafetyError);
  }
});

test('system, production-named, missing and invalid database URIs are refused', () => {
  for (const database of ['admin', 'config', 'local', 'eventnexus_production', 'eventnexus_live', '']) {
    assert.throws(() => assertDevelopment({ ...development, MONGO_URI: `mongodb://localhost/${database}`, EVENTNEXUS_SEED_DB: database }), SeedSafetyError);
  }
  assert.throws(() => assertDevelopment({ ...development, MONGO_URI: 'https://example.invalid/eventnexus_dev' }), SeedSafetyError);
  assert.throws(() => assertDevelopment({ ...development, MONGO_URI: 'not-a-uri' }), SeedSafetyError);
});

test('optional passwords enforce length and bcrypt byte limits; errors omit URI values', () => {
  for (const EVENTNEXUS_SEED_PASSWORD of ['short', 'a'.repeat(73), '🙂'.repeat(20)]) {
    assert.throws(() => assertDevelopment({ ...development, EVENTNEXUS_SEED_PASSWORD }), SeedSafetyError);
  }
  const uri = 'mongodb+srv://example-user:example-password@dev.example.invalid/eventnexus_dev';
  assert.throws(() => assertDevelopment({ ...development, MONGO_URI: uri, EVENTNEXUS_SEED_DB: 'wrong' }), error => !error.message.includes(uri) && !error.message.includes('example-password'));
});

test('catalog has exactly 30 distinct keys and titles in the six required categories', () => {
  const catalog = buildCatalog(new Date('2030-06-15T23:59:59Z'));
  assert.equal(CATALOG.length, 30);
  assert.equal(new Set(catalog.map(item => item.key)).size, 30);
  assert.equal(new Set(catalog.map(item => item.event.title)).size, 30);
  const counts = {};
  for (const { event } of catalog) counts[event.category] = (counts[event.category] || 0) + 1;
  assert.deepEqual(counts, DISTRIBUTION);
});

test('every sample passes the real event API validator and Mongoose model validation', async () => {
  const organizer = new mongoose.Types.ObjectId(); // Validation-only; no records are stored in this test.
  for (const item of buildCatalog()) {
    const { registeredCount, status, ...input } = item.event;
    createEventSchema.parse({ ...input, date: input.date.toISOString() });
    await new Event({ ...item.event, organizer }).validate();
    assert.ok(item.event.description.includes(MARKER));
    assert.ok(item.event.description.length < 2000);
    assert.equal(status, 'upcoming');
    assert.equal(registeredCount, item.attendees);
    assert.ok(item.attendees >= 0 && item.attendees <= item.event.capacity);
    await new Registration({ event: new mongoose.Types.ObjectId(), student: new mongoose.Types.ObjectId() }).validate();
  }
});

test('relative schedules remain future-dated across month/year and leap-day boundaries', () => {
  for (const instant of ['2030-12-31T23:59:59Z', '2032-02-28T23:59:59Z', '2030-01-01T00:00:00Z']) {
    const now = new Date(instant);
    const catalog = buildCatalog(now);
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(now); monthEnd.setMonth(monthEnd.getMonth() + 1);
    assert.ok(catalog.every(item => item.event.date > now));
    const weekCount = catalog.filter(item => item.event.date < weekEnd).length;
    const monthCount = catalog.filter(item => item.event.date < monthEnd).length;
    assert.ok(weekCount > 0 && weekCount < monthCount && monthCount < 30);
  }
});

test('availability includes open, limited and full events with real attendance plans', () => {
  const catalog = buildCatalog();
  assert.equal(catalog.filter(item => item.attendees === item.event.capacity).length, 6);
  assert.equal(catalog.filter(item => item.event.capacity - item.attendees === 2).length, 6);
  assert.ok(catalog.some(item => item.attendees === 0));
  assert.equal(Math.max(...catalog.map(item => item.attendees)), 60);
});

test('optional image URLs allow local assets and HTTPS, reject unsafe URLs, and support removal', async () => {
  for (const url of [undefined, '', '/images/events/ai-meetup.webp', 'https://images.example.org/event.jpg']) assert.ok(isEventImageUrl(url));
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,test', '//example.org/image.jpg', 'http://example.org/a.jpg', '/images/events/../../a.webp', 'https://user:password@example.org/a.jpg', 'https://example.org/a\nb.jpg', null]) assert.equal(isEventImageUrl(url), false);
  assert.deepEqual(updateEventSchema.parse({ imageUrl: '' }), { imageUrl: '' });
  assert.equal(updateEventSchema.safeParse({ imageUrl: 'javascript:alert(1)' }).success, false);
  const item = buildCatalog()[0].event;
  await new Event({ ...item, imageUrl: undefined, imageAlt: undefined, organizer: new mongoose.Types.ObjectId() }).validate();
  await assert.rejects(new Event({ ...item, imageUrl: '//unsafe.invalid/photo', organizer: new mongoose.Types.ObjectId() }).validate());
});

test('all 30 stable catalog keys have distinct licensed photo metadata and accessible descriptions', () => {
  assert.deepEqual(Object.keys(photos).sort(), CATALOG.map(row => row[0]).sort());
  assert.equal(new Set(Object.values(photos).map(photo => photo.id)).size, 30);
  for (const [key, photo] of Object.entries(photos)) {
    assert.equal(photo.imageUrl, `/images/events/${key}.webp`);
    assert.ok(photo.sourceUrl.startsWith('https://www.pexels.com/photo/') && photo.sourceUrl.endsWith(`-${photo.id}/`));
    assert.ok(photo.photographer.length > 0 && photo.alt.length > 10 && photo.alt.length <= 200);
    assert.equal(photo.licenseUrl, 'https://www.pexels.com/legal-pages/license/');
    assert.ok(photo.cropCenter.length === 2 && photo.cropCenter.every(value => value >= 0 && value <= 1));
  }
});

test('both local WebP sizes exist and the 30 main photographs have distinct content', async () => {
  await validatePhotoAssets();
  const hashes = [];
  for (const photo of Object.values(photos)) {
    const file = path.resolve(__dirname, '../../../client/public', photo.imageUrl.slice(1));
    hashes.push(crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'));
  }
  assert.equal(new Set(hashes).size, 30);
});
