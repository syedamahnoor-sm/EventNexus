import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialStudentDetails, registrationPayload, validateRegistration } from './registration.js';
import { authDestination } from '../auth/authRules.js';

const valid = { fullName: 'Campus Student', email: ' STUDENT@example.edu ', studentId: '24 / Arts-A', department: 'Fine Arts', studyStage: 'Year 2', contactNumber: '' };
test('form prefills only known session information; no invented academic profile', () => {
  assert.deepEqual(initialStudentDetails({ name: 'Actual Student', email: 'actual@example.edu' }), { fullName: 'Actual Student', email: 'actual@example.edu', studentId: '', department: '', studyStage: '', contactNumber: '' });
});
test('registration validation accepts university conventions, rejects missing/invalid/overlong details', () => {
  assert.deepEqual(validateRegistration(valid), {});
  assert.deepEqual(validateRegistration({ ...valid, contactNumber: '+1 (212) 555-0199' }), {});
  for (const name of ['fullName', 'email', 'studentId', 'department', 'studyStage']) assert.ok(validateRegistration({ ...valid, [name]: '' })[name]);
  assert.ok(validateRegistration({ ...valid, contactNumber: 'abcd123' }).contactNumber);
  assert.ok(validateRegistration({ ...valid, contactNumber: '1234567890123456' }).contactNumber);
  assert.ok(validateRegistration({ ...valid, department: 'x'.repeat(121) }).department);
});
test('submission whitelists only attendee fields and does not transmit seat counts or identity', () => {
  const result = registrationPayload({ ...valid, student: 'untrusted', capacity: 100 });
  assert.deepEqual(Object.keys(result), ['attendee']);
  assert.equal(result.attendee.email, 'student@example.edu');
  assert.equal(result.attendee.contactNumber, undefined);
  assert.equal(result.attendee.student, undefined);
});
test('login can restore a student registration destination but cannot grant organizer access', () => {
  const destination = '/events/1234567890abcdef12345678/register';
  assert.equal(authDestination(destination, 'student'), destination);
  assert.equal(authDestination(destination, 'organizer'), '/events');
});
