import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupStudentRegistrations, registrationEventState, dashboardEventTime } from './studentDashboard.js';

const now = Date.UTC(2026, 10, 7, 12);
const entry = (id, offset, status = 'upcoming') => ({ _id: id, event: { _id: `event-${id}`, title: id, status, date: new Date(now + offset).toISOString() } });

test('counts and next event derive from all owned records; sort upcoming ascending and past descending', () => {
  const records = [entry('later', 5000), entry('old', -9000, 'completed'), entry('next', 1000), entry('recent', -1000)];
  const grouped = groupStudentRegistrations(records, now);
  assert.deepEqual(grouped.upcoming.map(item => item._id), ['next', 'later']);
  assert.deepEqual(grouped.past.map(item => item._id), ['recent', 'old']);
  assert.equal(grouped.next._id, 'next');
  assert.equal(grouped.unavailable.length, 0);
  assert.deepEqual(records.map(item => item._id), ['later', 'old', 'next', 'recent']);
});
test('exact scheduled start belongs to past; stale upcoming status cannot keep an expired event upcoming', () => {
  const result = groupStudentRegistrations([entry('boundary', 0), entry('future', 1)], now);
  assert.equal(result.past[0]._id, 'boundary');
  assert.equal(result.next._id, 'future');
});
test('cancelled, future-completed, missing and invalid event data never inflate upcoming/past counts', () => {
  const records = [entry('cancelled-before', -1000, 'cancelled'), entry('cancelled-after', 1000, 'cancelled'), entry('future-completed', 1000, 'completed'), { _id: 'deleted', event: null }, { _id: 'unpopulated', event: 'an-object-id' }, { _id: 'invalid', event: { _id: 'invalid', status: 'upcoming', date: 'invalid' } }, { _id: 'unknown-date', event: { _id: 'none', status: 'upcoming', date: null } }];
  const result = groupStudentRegistrations(records, now);
  assert.equal(result.unavailable.length, records.length);
  assert.equal(result.upcoming.length + result.past.length, 0);
  assert.equal(result.next, null);
  assert.equal(registrationEventState(records[0].event), 'Event cancelled');
  assert.equal(registrationEventState(null), 'Event no longer available');
  assert.equal(dashboardEventTime('invalid'), 'Time unavailable');
});
test('empty registrations have honest zero counts and no next event', () => {
  assert.deepEqual(groupStudentRegistrations([], now), { upcoming: [], past: [], unavailable: [], next: null });
});
test('matching dates have stable registration-reference order', () => {
  const result = groupStudentRegistrations([entry('b', 1000), entry('a', 1000), entry('d', -1000), entry('c', -1000)], now);
  assert.deepEqual(result.upcoming.map(item => item._id), ['a', 'b']);
  assert.deepEqual(result.past.map(item => item._id), ['c', 'd']);
});
