const { test } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const publicUser = require('../src/utils/publicUser');
const { updateProfileSchema } = require('../src/validators/profileValidation');

test('profile validation permits incomplete academic details and flexible university formats', () => {
  assert.equal(updateProfileSchema.safeParse({ version: 0, name: 'Campus Student', studentId: '', department: '', studyStage: '', contactNumber: '' }).success, true);
  const result = updateProfileSchema.parse({ version: 1, studentId: ' ENG / 24-A ', studyStage: 'Foundation year', contactNumber: '+92 (300) 123-4567' });
  assert.equal(result.studentId, 'ENG / 24-A');
  assert.equal(updateProfileSchema.safeParse({ version: 0 }).success, false);
});
test('profile updates reject protected/unknown fields, unsafe versions and invalid academic/contact data', () => {
  for (const field of ['role', 'email', 'password', 'student', '_id', 'studentProfile', 'createdAt', '$set']) assert.equal(updateProfileSchema.safeParse({ version: 0, name: 'Campus Student', [field]: 'untrusted' }).success, false);
  for (const bad of [{ version: -1 }, { version: 0.5 }, { version: '0' }, { version: Number.MAX_SAFE_INTEGER }, { name: ' ' }, { department: 'A' }, { studentId: 'x'.repeat(81) }, { studyStage: 'x'.repeat(61) }, { contactNumber: 'not-a-phone' }, { contactNumber: '123456' }]) assert.equal(updateProfileSchema.safeParse({ version: 0, name: 'Campus Student', ...bad }).success, false);
});
test('legacy users require no profile migration; safe serialization exposes only self-service fields', async () => {
  const user = new User({ name: 'Existing Student', email: 'student@example.edu', password: 'hashed-password', role: 'student' });
  await user.validate();
  assert.equal(user.studentProfile, undefined);
  assert.equal(user.profileVersion, 0);
  const output = publicUser(user);
  assert.equal(output.password, undefined); assert.equal(output.__v, undefined);
  assert.deepEqual(output.studentProfile, { studentId: '', department: '', studyStage: '', contactNumber: '' });
  user.studentProfile = { studentId: 'ID 1', department: 'Arts', studyStage: 'Year 2', contactNumber: '' };
  await user.validate(); assert.equal(user.studentProfile._id, undefined);
  user.studentProfile.contactNumber = 'invalid'; await assert.rejects(user.validate());
  user.role = 'organizer'; assert.equal(publicUser(user).studentProfile, undefined);
});
