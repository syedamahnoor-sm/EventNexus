import test from 'node:test';
import assert from 'node:assert/strict';
import { organizerQuery, organizerStatus, organizerCapacity } from './organizerDashboard.js';

test('workspace query defaults safely and preserves valid lifecycle/pagination destinations', () => {
  assert.deepEqual(organizerQuery(new URLSearchParams('view=past&page=2')), { view: 'past', page: 2 });
  for (const value of ['0', '-1', '1.5', '1000001', 'abc']) assert.equal(organizerQuery(new URLSearchParams(`page=${value}`)).page, 1);
  assert.equal(organizerQuery(new URLSearchParams('view=anything')).view, 'upcoming');
});
test('labels distinguish scheduled, cancelled, completed, expired and inconsistent events', () => {
  assert.equal(organizerStatus({ phase: 'upcoming', status: 'upcoming' }), 'Scheduled');
  assert.equal(organizerStatus({ phase: 'past', status: 'upcoming' }), 'Past event');
  assert.equal(organizerStatus({ phase: 'past', status: 'completed' }), 'Completed');
  assert.equal(organizerStatus({ phase: 'cancelled' }), 'Cancelled');
  assert.equal(organizerStatus({ phase: 'review' }), 'Needs review');
});
test('capacity derives only from real counters, clamps display bounds and never invents availability', () => {
  assert.deepEqual(organizerCapacity({ capacity: 10, registeredCount: 8 }), { count: 8, capacity: 10, remaining: 2, percent: 80, full: false });
  assert.deepEqual(organizerCapacity({ capacity: 10, registeredCount: 11 }), { count: 11, capacity: 10, remaining: 0, percent: 100, full: true });
  for (const event of [{}, { capacity: 0, registeredCount: 0 }, { capacity: 10, registeredCount: -1 }, { capacity: 10, registeredCount: '8' }]) assert.equal(organizerCapacity(event), null);
});
