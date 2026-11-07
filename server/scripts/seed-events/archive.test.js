const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Event = require('../../src/models/Event');
const { eventWindow } = require('../../src/utils/eventLifecycle');
const { updateRecapSchema, updateEventSchema } = require('../../src/validators/eventValidator');
const { HISTORY, buildHistorical, ARCHIVE_BATCH } = require('./historical');

test('past/upcoming windows partition the exact scheduled instant and exclude cancellation from archive', () => {
  const now = new Date('2030-01-01T12:00:00Z');
  assert.deepEqual(eventWindow('upcoming', undefined, now), { status: 'upcoming', date: { $gt: now } });
  assert.deepEqual(eventWindow('past', undefined, now), { status: { $in: ['upcoming', 'completed'] }, date: { $lte: now } });
  assert.deepEqual(eventWindow('past', 'completed', now), { status: 'completed', date: { $lte: now } });
  assert.deepEqual(eventWindow('upcoming', 'completed', now).date, { $lte: now });
});

test('recap patch accepts only optional organizer content, with bounded and accessible galleries', () => {
  assert.deepEqual(updateRecapSchema.parse({ recap: '' }), { recap: '' });
  assert.deepEqual(updateRecapSchema.parse({ highlights: [], gallery: [] }), { highlights: [], gallery: [] });
  assert.equal(updateRecapSchema.safeParse({}).success, false);
  for (const input of [{ capacity: 1 }, { organizer: 'someone' }, { status: 'completed' }, { recap: 'x'.repeat(10001) }, { highlights: Array(9).fill('Highlight') }, { gallery: [{ imageUrl: 'javascript:alert(1)', alt: 'A photograph' }] }, { gallery: [{ imageUrl: 'https://example.org/photo.jpg' }] }]) {
    assert.equal(updateRecapSchema.safeParse(input).success, false);
  }
  assert.equal(updateRecapSchema.safeParse({ gallery: [{ imageUrl: '/images/events/ai-meetup.webp', alt: 'A student discussion', caption: 'From the organizer' }] }).success, true);
  assert.equal(updateEventSchema.safeParse({ recap: 'Past recap' }).success, false);
});

test('recap model fields validate without adding defaults or fabricated content', async () => {
  const base = { ...buildHistorical()[0].event, organizer: new mongoose.Types.ObjectId() };
  const event = new Event(base);
  await event.validate();
  assert.equal(event.recap, undefined); assert.equal(event.highlights, undefined); assert.equal(event.gallery, undefined);
  await assert.rejects(new Event({ ...base, highlights: Array(9).fill('A highlight') }).validate());
  await assert.rejects(new Event({ ...base, gallery: [{ imageUrl: 'https://example.org/a.jpg' }] }).validate());
});

test('historical seed has two eligible events per category, plus one excluded cancelled fixture', async () => {
  const now = new Date('2030-01-01T01:00:00Z');
  const catalog = buildHistorical(now);
  assert.equal(catalog.length, 13); assert.equal(HISTORY.length, 13);
  const counts = {};
  for (const { key, event } of catalog) {
    assert.ok(event.date < now); assert.equal(event.registeredCount, 0); assert.ok(event.description.includes(ARCHIVE_BATCH));
    assert.ok(event.description.includes('Fictional')); assert.ok(event.imageUrl);
    assert.equal(event.recap, undefined); assert.equal(event.highlights, undefined); assert.equal(event.gallery, undefined);
    if (event.status !== 'cancelled') counts[event.category] = (counts[event.category] || 0) + 1;
    await new Event({ ...event, organizer: new mongoose.Types.ObjectId() }).validate();
    assert.ok(key);
  }
  assert.deepEqual(counts, { Technology: 2, Workshops: 2, Competitions: 2, Career: 2, Community: 2, Other: 2 });
  assert.equal(catalog.filter(item => item.event.status === 'upcoming').length, 2);
});
