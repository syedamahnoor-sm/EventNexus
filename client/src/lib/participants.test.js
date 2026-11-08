import { test } from 'node:test';
import assert from 'node:assert/strict';
import { participantQuery, participantValue, registrationDate, participantError } from './participants.js';
import { authDestination, initialLoginRole } from '../auth/authRules.js';

test('roster URL state bounds pages and searches without accepting ownership controls', () => {
  assert.deepEqual(participantQuery(new URLSearchParams('search=++Ada++&sort=oldest&page=2')), { search: 'Ada', sort: 'oldest', page: 2 });
  for (const page of ['0', '-1', '1.2', '1000001', 'oops']) assert.equal(participantQuery(new URLSearchParams({ page })).page, 1);
  assert.equal(participantQuery(new URLSearchParams({ search: 'x'.repeat(200) })).search.length, 120);
  assert.equal(participantQuery(new URLSearchParams('sort=unsupported')).sort, 'newest');
});
test('legacy presentation never invents student information or dates', () => {
  for (const value of [undefined, null, '', ' ', 15]) assert.equal(participantValue(value), 'Not recorded');
  assert.equal(participantValue('Original submitted name'), 'Original submitted name');
  for (const date of [null, undefined, 'bad']) assert.equal(registrationDate(date), 'Not recorded');
  assert.notEqual(registrationDate('2030-01-01T12:00:00Z'), 'Not recorded');
  assert.equal(participantError(403), 'forbidden'); assert.equal(participantError(404), 'missing'); assert.equal(participantError(401), 'session'); assert.equal(participantError(500), 'network');
});
test('participant return paths are organizer-only and preserve roster filters', () => {
  const base = '/organizer/events/1234567890abcdef12345678/participants';
  for (const path of [base + '?search=campus&page=2', base + '/abcdef1234567890abcdef12']) {
    assert.equal(authDestination(path, 'organizer'), path);
    assert.equal(authDestination(path, 'student'), '/student/dashboard');
    assert.equal(initialLoginRole({ from: path }), 'organizer');
  }
  assert.equal(authDestination(base + '/not-an-id', 'organizer'), '/organizer/dashboard');
});
