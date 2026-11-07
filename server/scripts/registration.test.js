const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Registration = require('../src/models/Registration');
const { registerForEventSchema } = require('../src/validators/registrationValidation');
const attendee = { fullName: 'Campus Student', email: ' STUDENT@example.edu ', studentId: 'ENG / 24-A', department: 'Design & Technology', studyStage: 'Foundation year', contactNumber: '+92 (300) 123-4567' };

test('registration accepts flexible university identifiers and normalizes contact information', () => {
  const result = registerForEventSchema.parse({ attendee });
  assert.equal(result.attendee.email, 'student@example.edu');
  assert.equal(result.attendee.studentId, attendee.studentId);
  assert.equal(registerForEventSchema.safeParse({ attendee: { ...attendee, contactNumber: '' } }).success, true);
});
test('empty payloads, spoofed identity/capacity and invalid student details are rejected', () => {
  for (const body of [{}, { attendee, student: new mongoose.Types.ObjectId() }, { attendee, event: new mongoose.Types.ObjectId() }, { attendee, registeredCount: 0 }, { attendee: { ...attendee, role: 'student' } }]) assert.equal(registerForEventSchema.safeParse(body).success, false);
  for (const invalid of [{ fullName: ' ' }, { email: 'no-email' }, { studentId: '' }, { department: 'a' }, { studyStage: '' }, { contactNumber: 'call me tomorrow' }, { contactNumber: '+12' }, { contactNumber: '1'.repeat(16) }, { studentId: 'x'.repeat(81) }]) assert.equal(registerForEventSchema.safeParse({ attendee: { ...attendee, ...invalid } }).success, false);
});
test('legacy registrations remain valid; new snapshots validate without extra subdocument identifiers', async () => {
  const identity = { student: new mongoose.Types.ObjectId(), event: new mongoose.Types.ObjectId() };
  const legacy = new Registration(identity);
  await legacy.validate(); assert.equal(legacy.attendee, undefined);
  const current = new Registration({ ...identity, attendee: registerForEventSchema.parse({ attendee }).attendee });
  await current.validate(); assert.equal(current.attendee._id, undefined);
  current.attendee.studentId = '';
  await assert.rejects(current.validate());
  assert.ok(Registration.schema.indexes().some(([fields, options]) => fields.student === 1 && fields.event === 1 && options.unique));
});
