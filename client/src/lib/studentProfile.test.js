import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileCompleteness, profileInitials, profilePayload, profileValues, validateProfile, readProfileDraft, storeProfileDraft, clearProfileDraft, clearOtherProfileDrafts } from './studentProfile.js';
import { initialStudentDetails } from './registration.js';
import { authDestination } from '../auth/authRules.js';
import { createAuthClient } from '../auth/authClient.js';
const user = { id: 'actual-user', name: 'Actual Student', email: 'actual@example.edu', profileVersion: 0, studentProfile: { studentId: '24 / Arts-A', department: 'Fine Arts', studyStage: 'Year 2', contactNumber: '' } };

test('completeness uses only saved essentials; optional phone is not a score requirement', () => {
  assert.deepEqual(profileCompleteness(user), { complete: 5, total: 5, percent: 100 });
  assert.deepEqual(profileCompleteness({ name: user.name, email: user.email }), { complete: 2, total: 5, percent: 40 });
  assert.equal(profileInitials('  Actual Campus Student  '), 'AS');
  assert.equal(profileInitials('Student'), 'S');
});
test('profile payload whitelists editable fields and aligns validation with incomplete profiles', () => {
  const values = profileValues(user);
  assert.deepEqual(validateProfile(values), {});
  assert.deepEqual(validateProfile({ ...values, studentId: '', department: '', studyStage: '' }), {});
  assert.ok(validateProfile({ ...values, name: '' }).name);
  assert.ok(validateProfile({ ...values, department: 'A' }).department);
  assert.ok(validateProfile({ ...values, contactNumber: 'bad' }).contactNumber);
  const payload = profilePayload({ ...values, role: 'organizer', email: 'changed@example.edu' }, 0);
  assert.equal(payload.email, undefined); assert.equal(payload.role, undefined); assert.equal(payload.version, 0);
});
test('saved academic details prefill future registrations without mutating source or existing snapshots', () => {
  const before = JSON.stringify(user);
  const values = initialStudentDetails(user);
  assert.deepEqual(values, { fullName: user.name, email: user.email, ...user.studentProfile });
  values.studentId = 'Registration-only change';
  assert.equal(JSON.stringify(user), before);
  assert.equal(initialStudentDetails({ name: 'Incomplete', email: 'incomplete@example.edu' }).studentId, '');
});
test('in-memory drafts are scoped to identity and can be discarded on logout', () => {
  const values = profileValues(user);
  storeProfileDraft(user.id, { values, baseValues: values, version: 0 });
  assert.equal(readProfileDraft('another-user'), null);
  assert.equal(readProfileDraft(user.id).values.name, user.name);
  clearOtherProfileDrafts('another-user'); assert.equal(readProfileDraft(user.id), null);
  storeProfileDraft(user.id, { values, baseValues: values, version: 0 }); clearProfileDraft(user.id);
  assert.equal(readProfileDraft(user.id), null);
});
test('profile destination is role-aware and PATCH retains the existing CSRF protocol', async () => {
  assert.equal(authDestination('/student/profile', 'student'), '/student/profile');
  assert.equal(authDestination('/student/profile', 'organizer'), '/events');
  let writes = 0;
  const client = createAuthClient({ get: async () => ({ data: { csrfToken: 'a'.repeat(64) } }), patch: async (path, body, config) => { writes++; assert.equal(path, '/students/profile'); assert.equal(config.headers['X-CSRF-Token'].length, 64); assert.equal(body.version, 0); return { data: { user } }; } });
  assert.equal((await client.patch('/students/profile', profilePayload(profileValues(user), 0))).user.id, user.id); assert.equal(writes, 1);
});
