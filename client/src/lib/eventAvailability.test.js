import test from 'node:test';
import assert from 'node:assert/strict';
import { eventAvailability } from './eventAvailability.js';

const now = Date.parse('2030-01-01T12:00:00Z');
const event = { status: 'upcoming', date: '2030-01-02T12:00:00Z', capacity: 20, registeredCount: 7 };

test('future events expose actual capacity and remaining seats', () => {
  const result = eventAvailability(event, now);
  assert.equal(result.canRegister, true);
  assert.equal(result.remaining, 13);
  assert.equal(result.capacity, 20);
});

test('full and over-capacity events never offer registration or negative seats', () => {
  for (const registeredCount of [20, 25]) {
    const result = eventAvailability({ ...event, registeredCount }, now);
    assert.equal(result.state, 'full');
    assert.equal(result.canRegister, false);
    assert.equal(result.remaining, 0);
  }
});

test('cancellation and completion take priority over date and seat availability', () => {
  for (const status of ['cancelled', 'completed']) {
    const result = eventAvailability({ ...event, status, date: '2029-01-01T00:00:00Z', registeredCount: 20 }, now);
    assert.equal(result.state, status);
    assert.equal(result.canRegister, false);
  }
});

test('registration closes precisely at the scheduled start time', () => {
  assert.equal(eventAvailability({ ...event, date: new Date(now).toISOString() }, now).state, 'past');
  assert.equal(eventAvailability({ ...event, date: new Date(now - 1).toISOString() }, now).canRegister, false);
  assert.equal(eventAvailability({ ...event, date: new Date(now + 1).toISOString() }, now).canRegister, true);
});

test('unknown dates, capacity and statuses cannot accidentally enable registration', () => {
  for (const update of [{ date: 'invalid' }, { capacity: undefined }, { capacity: 0 }, { status: 'unknown' }]) {
    const result = eventAvailability({ ...event, ...update }, now);
    assert.equal(result.state, 'unconfirmed');
    assert.equal(result.canRegister, false);
  }
});
