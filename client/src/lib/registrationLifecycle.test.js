import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeRegistration, organizerCanCancel, registrationStatus } from './registrationLifecycle.js';
import { groupStudentRegistrations } from './studentDashboard.js';
import { canCancelRegistration } from './cancellation.js';
import { participantQuery } from './participants.js';

test('legacy records stay active; terminal registrations cannot offer student or organizer cancellation', () => {
  const event = { status: 'upcoming', date: '2030-02-01' }, now = Date.parse('2030-01-01');
  for (const status of [undefined, null, 'active']) { const record = { _id: 'ref', status }; assert.equal(activeRegistration(record), true); assert.equal(canCancelRegistration(event, record, now), true); assert.equal(organizerCanCancel(event, record, now), true); }
  for (const status of ['cancelled_by_student', 'cancelled_by_organizer']) { const record = { _id: 'ref', status }; assert.equal(activeRegistration(record), false); assert.equal(canCancelRegistration(event, record, now), false); assert.equal(organizerCanCancel(event, record, now), false); assert.match(registrationStatus(record), /Cancelled/); }
});
test('student metrics exclude cancellations but preserve independent historical attempts and reasons', () => {
  const event = { _id: 'event', status: 'upcoming', date: '2030-02-01' };
  const records = [{ _id: 'old', event, status: 'cancelled_by_organizer', cancellation: { at: '2030-01-01', reason: 'Original reason' } }, { _id: 'new', event, status: 'active' }, { _id: 'older', event, status: 'cancelled_by_student', cancellation: { at: '2029-12-01' } }];
  const grouped = groupStudentRegistrations(records, Date.parse('2030-01-02')); assert.deepEqual(grouped.upcoming.map(r => r._id), ['new']); assert.deepEqual(grouped.cancelled.map(r => r._id), ['old', 'older']); assert.equal(grouped.next._id, 'new'); assert.equal(grouped.cancelled[0].cancellation.reason, 'Original reason'); assert.equal(grouped.past.length, 0);
});
test('roster status links accept only actual lifecycle filters', () => {
  for (const status of ['active', 'all', 'cancelled_by_student', 'cancelled_by_organizer']) assert.equal(participantQuery(new URLSearchParams({ status })).status, status);
  assert.equal(participantQuery(new URLSearchParams('status=approved')).status, 'active');
});
