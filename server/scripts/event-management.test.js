const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const { createEventSchema, updateEventSchema } = require('../src/validators/eventValidator');
const { UUID, assertFutureDate, assertEditable, expectedEventVersion, creationFingerprint, publicEvent } = require('../src/utils/eventManagement');

const input = () => ({ title: 'Campus Design Exchange', description: 'Meet fellow campus makers for a thoughtful exchange of ideas.', category: 'Workshops', location: 'Student Commons', capacity: 30, date: new Date(Date.now() + 86400000).toISOString(), imageUrl: 'https://example.org/photo.webp', imageAlt: 'Students sharing design work' });
test('event schemas whitelist actual fields and require accessible image descriptions', () => {
    assert.equal(createEventSchema.safeParse(input()).success, true);
    for (const changes of [{ title: 'ab' }, { description: 'short' }, { location: 'a' }, { capacity: 0 }, { capacity: 1.5 }, { capacity: Number.MAX_SAFE_INTEGER + 1 }, { category: 'Fake' }, { date: '2030-02-30T09:00:00Z' }, { imageUrl: 'data:image/png;base64,x' }, { imageUrl: 'http://example.org/a.jpg' }, { imageAlt: '' }, { organizer: new mongoose.Types.ObjectId() }, { registeredCount: 0 }, { status: 'cancelled' }, { creationKey: 'spoofed' }]) assert.equal(createEventSchema.safeParse({ ...input(), ...changes }).success, false, JSON.stringify(changes));
    assert.equal(updateEventSchema.safeParse({}).success, false);
    assert.equal(updateEventSchema.safeParse({ status: 'cancelled' }).success, false);
    const parsed = updateEventSchema.parse({ imageUrl: '' }); assert.equal(parsed.category, undefined);
});
test('future instant validation rejects the exact start boundary and invalid dates', () => {
    const now = new Date('2030-01-01T12:00:00Z');
    assert.doesNotThrow(() => assertFutureDate('2030-01-01T12:00:01Z', now));
    for (const value of ['invalid', now, '2030-01-01T11:59:59Z']) assert.throws(() => assertFutureDate(value, now), error => error.status === 400 && error.field === 'date');
});
test('only future scheduled records can mutate and stale organizer edits are rejected', () => {
    const now = new Date(), future = new Date(Date.now() + 86400000);
    assert.doesNotThrow(() => assertEditable({ status: 'upcoming', date: future, __v: 2 }, 2, now));
    assert.throws(() => assertEditable({ status: 'upcoming', date: future, __v: 2 }, 1, now), error => error.status === 409);
    for (const event of [{ status: 'cancelled', date: future }, { status: 'completed', date: future }, { status: 'upcoming', date: now }]) assert.throws(() => assertEditable(event, null, now), error => error.status === 409);
    assert.equal(expectedEventVersion(undefined), null); assert.equal(expectedEventVersion('0'), 0);
    for (const value of ['-1', '1.2', '01', '', '9007199254740991']) assert.throws(() => expectedEventVersion(value));
});
test('creation recovery uses a stable fingerprint and server-only metadata never serializes', async () => {
    const data = input();
    assert.equal(creationFingerprint(data), creationFingerprint(Object.fromEntries(Object.entries(data).reverse())));
    assert.notEqual(creationFingerprint(data), creationFingerprint({ ...data, title: 'Different event' }));
    const key = require('node:crypto').randomUUID(); assert.equal(UUID.test(key), true);
    const event = new Event({ ...data, organizer: new mongoose.Types.ObjectId(), creationKey: key, creationFingerprint: creationFingerprint(data) });
    await event.validate();
    assert.equal(publicEvent(event).creationKey, undefined); assert.equal(publicEvent(event).creationFingerprint, undefined);
    assert.ok(Event.schema.indexes().some(([fields, options]) => fields.organizer === 1 && fields.creationKey === 1 && options.unique && options.partialFilterExpression));
    await new Event({ ...data, organizer: new mongoose.Types.ObjectId() }).validate();
});
