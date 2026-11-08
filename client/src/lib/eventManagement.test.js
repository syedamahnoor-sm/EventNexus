import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { authDestination } from '../auth/authRules.js';
import { canManageEvent, clearEventDraft, clearOtherEventDrafts, eventFormPayload, eventFormValues, eventMatches, localEventDate, parseLocalEventDate, readEventDraft, storeEventDraft, validateEventForm, validEventImage } from './eventManagement.js';

function values() { return { title: 'Campus Creative Exchange', description: 'An evening of making, sharing and creative campus conversation.', category: 'Workshops', date: localEventDate(new Date(Date.now() + 86400000)), location: 'Student Studio', capacity: '30', imageUrl: '', imageAlt: '' }; }
test('event form validation aligns required fields, lengths, capacities and image accessibility', () => {
  assert.deepEqual(validateEventForm(values()), {});
  for (const [name, value] of [['title', 'a'], ['description', 'short'], ['location', 'x'], ['category', 'fake'], ['capacity', '0'], ['capacity', '1.5'], ['capacity', '9007199254740992'], ['date', '2020-01-01T12:00'], ['imageUrl', 'http://example.org/a.jpg']]) assert.ok(validateEventForm({ ...values(), [name]: value })[name]);
  assert.ok(validateEventForm({ ...values(), imageUrl: 'https://example.org/a.jpg' }).imageAlt);
  assert.deepEqual(validateEventForm({ ...values(), imageUrl: 'https://example.org/a.jpg', imageAlt: 'Campus discussion' }), {});
});
test('local date editing preserves the exact instant across timezones and rejects rolled dates', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'Asia/Karachi', 'America/New_York']) { process.env.TZ = timezone; const instant = '2030-07-01T12:34:56.789Z'; assert.equal(parseLocalEventDate(localEventDate(instant)).toISOString(), instant); }
    process.env.TZ = 'America/New_York'; assert.equal(parseLocalEventDate('2030-03-10T02:30'), null);
    assert.equal(parseLocalEventDate('2030-02-30T12:00'), null); assert.equal(parseLocalEventDate('invalid'), null);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('payloads whitelist persisted event fields and prefilling never invents content', () => {
  const data = eventFormPayload({ ...values(), organizer: 'forged', registeredCount: 100, status: 'completed' });
  assert.equal(data.organizer, undefined); assert.equal(data.registeredCount, undefined); assert.equal(data.status, undefined);
  assert.equal(data.capacity, 30); assert.equal(eventMatches({ ...data }, data), true); assert.equal(eventMatches({ ...data, location: 'Changed' }, data), false);
  const edit = eventFormValues({ ...data, _id: 'record' }); assert.equal(edit.title, data.title); assert.equal(eventFormPayload(edit).date, data.date);
  assert.equal(eventFormValues(null).title, '');
});
test('only future scheduled records expose management and only organizers return to editor routes', () => {
  const id = '123456789012345678901234', future = new Date(Date.now() + 86400000).toISOString();
  assert.equal(canManageEvent({ _id: id, date: future, status: 'upcoming' }), true);
  for (const status of ['cancelled', 'completed']) assert.equal(canManageEvent({ _id: id, date: future, status }), false);
  assert.equal(canManageEvent({ _id: id, date: new Date().toISOString(), status: 'upcoming' }), false);
  for (const route of ['/organizer/events/new', `/organizer/events/${id}/edit`]) { assert.equal(authDestination(route, 'organizer'), route); assert.equal(authDestination(route, 'student'), '/student/dashboard'); }
});
test('image URLs refuse unsafe schemes, credentials, whitespace and vectors in data URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,evil', '//example.org/a', 'https://user:pass@example.org/a', 'https://example.org/a b', 'https://example.org/\\evil']) assert.equal(validEventImage(url), false);
  assert.equal(validEventImage('/images/events/ai-meetup.webp'), true); assert.equal(validEventImage('https://example.org/a.webp'), true);
});
test('draft and uncertain-submission recovery are account scoped and cleared on explicit discard/logout', () => {
  const draft = { values: values(), base: values(), version: 0, creationKey: crypto.randomUUID(), submitted: eventFormPayload(values()), uncertain: true };
  storeEventDraft('owner', null, draft); assert.deepEqual(readEventDraft('owner', null), draft); assert.equal(readEventDraft('someone', null), null);
  clearOtherEventDrafts('someone'); assert.equal(readEventDraft('owner', null), null);
  storeEventDraft('owner', 'id', draft); clearEventDraft('owner', 'id'); assert.equal(readEventDraft('owner', 'id'), null); clearOtherEventDrafts(null);
});
