const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const { questionsSchema, validateEventAnswers } = require('../src/validators/registrationQuestions');
const { createEventSchema, updateEventSchema } = require('../src/validators/eventValidator');
const { registerForEventSchema } = require('../src/validators/registrationValidation');
const types = ['short_text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown'];
const makeQuestions = () => types.map((type, order) => ({ id: randomUUID(), text: `Campus preparation question ${order + 1}`, type, required: true, order, options: order < 2 ? [] : [{ id: randomUUID(), label: 'First choice' }, { id: randomUUID(), label: 'Second choice' }] }));
const payload = questions => questions.map(question => ({ questionId: question.id, value: question.type === 'multiple_choice' ? question.options.map(option => option.id) : question.options.length ? question.options[0].id : 'A meaningful response' }));
const actor = { fullName: 'Campus Student', email: 'student@example.edu', studentId: 'ART / 12', department: 'Design', studyStage: 'Year 2' };
test('definitions support all types with stable unique IDs, contiguous order and strict bounded options', () => {
    const questions = makeQuestions(); assert.equal(questionsSchema.safeParse(questions).success, true);
    for (const invalid of [[...questions, questions[0]], questions.map((q, i) => i ? q : { ...q, order: 2 }), [{ ...questions[0], text: '<script>run()</script>', order: 0 }], [{ ...questions[0], required: 'yes', order: 0 }], [{ ...questions[2], order: 0, options: [] }], [{ ...questions[2], order: 0, options: [{ ...questions[2].options[0] }, { ...questions[2].options[0] }] }], [{ ...questions[0], text: 'x'.repeat(241), order: 0 }], Array.from({ length: 11 }, (_, order) => ({ ...questions[0], id: randomUUID(), order }))]) assert.equal(questionsSchema.safeParse(invalid).success, false);
    assert.equal(questionsSchema.safeParse([{ ...questions[2], order: 0, options: [{ id: randomUUID(), label: 'Same' }, { id: randomUUID(), label: ' same ' }] }]).success, false);
});
test('real event API schemas persist definitions but reject client-owned question revisions and unknown properties', () => {
    const base = { title: 'Campus question workshop', description: 'Real details about the campus workshop.', category: 'Workshops', location: 'Student studio', capacity: 20, date: new Date(Date.now() + 86400000).toISOString(), registrationQuestions: makeQuestions() };
    assert.equal(createEventSchema.safeParse(base).success, true);
    assert.equal(createEventSchema.safeParse({ ...base, registrationQuestionsVersion: 99 }).success, false);
    assert.equal(updateEventSchema.safeParse({ registrationQuestions: [] }).success, true);
    assert.equal(updateEventSchema.safeParse({ registrationQuestions: [{ ...base.registrationQuestions[0], executable: true }] }).success, false);
});
test('authoritative validation snapshots all types in event order with selected labels and normalized text', () => {
    const questions = makeQuestions(), body = payload(questions).reverse();
    const result = validateEventAnswers({ registrationQuestions: questions, registrationQuestionsVersion: 3 }, body, 3);
    assert.equal(result.questionVersion, 3); assert.deepEqual(result.answers.map(answer => answer.questionId), questions.map(question => question.id));
    assert.equal(result.answers[0].answerText, 'A meaningful response'); assert.equal(result.answers[2].selectedOptions[0].label, 'First choice'); assert.equal(result.answers[3].selectedOptions.length, 2);
    const old = JSON.stringify(result);
    questions[0].text = 'Changed question'; questions[2].options[0].label = 'Changed label'; questions.reverse();
    assert.equal(JSON.stringify(result), old);
});
test('required, types, option membership, duplicates and maximum answer sizes are enforced', () => {
    const questions = makeQuestions(), event = { registrationQuestions: questions, registrationQuestionsVersion: 1 };
    assert.throws(() => validateEventAnswers(event, [], 1), error => error.status === 400 && error.errors.length === 5);
    const originals = payload(questions);
    for (const [index, value] of [[0, []], [0, 'x'.repeat(201)], [1, 'x'.repeat(1001)], [1, '<img onerror=evil>'], [2, randomUUID()], [3, [questions[3].options[0].id, questions[3].options[0].id]], [3, 'one choice'], [4, [questions[4].options[0].id]]]) assert.throws(() => validateEventAnswers(event, originals.map((answer, i) => i === index ? { ...answer, value } : answer), 1), error => error.status === 400);
    assert.throws(() => validateEventAnswers(event, [...originals, originals[0]], 1), error => error.status === 400);
    assert.throws(() => validateEventAnswers(event, [...originals, { questionId: randomUUID(), value: '' }], 1), error => error.status === 400);
});
test('optional omissions are not fabricated; events without questions accept legacy registration payloads', () => {
    const questions = makeQuestions().map(question => ({ ...question, required: false }));
    assert.deepEqual(validateEventAnswers({ registrationQuestions: questions }, [], 0), { answers: [], questionVersion: 0 });
    assert.deepEqual(validateEventAnswers({}, undefined, undefined), { answers: [], questionVersion: 0 });
    assert.equal(registerForEventSchema.safeParse({ attendee: actor }).success, true);
    assert.equal(registerForEventSchema.safeParse({ attendee: actor, answers: [{ questionId: questions[0].id, value: 'Response', questionText: 'Forged definition' }] }).success, false);
    assert.equal(registerForEventSchema.safeParse({ attendee: actor, registrationQuestions: questions }).success, false);
});
test('stale or absent question revisions require a fresh review, including removed question sets', () => {
    const questions = makeQuestions();
    for (const version of [undefined, 0, 2]) assert.throws(() => validateEventAnswers({ registrationQuestions: questions, registrationQuestionsVersion: 1 }, payload(questions), version), error => error.status === 409 && error.code === 'QUESTIONS_CHANGED');
    assert.throws(() => validateEventAnswers({ registrationQuestions: [], registrationQuestionsVersion: 2 }, [], 1), error => error.status === 409);
    assert.deepEqual(validateEventAnswers({ registrationQuestions: [], registrationQuestionsVersion: 2 }, [], 2), { answers: [], questionVersion: 2 });
});
test('Mongoose supports legacy registrations and validates immutable answer snapshots without subdocument IDs', async () => {
    const questions = makeQuestions(), response = validateEventAnswers({ registrationQuestions: questions, registrationQuestionsVersion: 1 }, payload(questions), 1);
    const legacy = new Registration({ student: new mongoose.Types.ObjectId(), event: new mongoose.Types.ObjectId() }); await legacy.validate(); assert.equal(legacy.answers, undefined);
    const record = new Registration({ student: legacy.student, event: legacy.event, attendee: actor, ...response }); await record.validate();
    assert.equal(record.answers[0]._id, undefined); assert.equal(record.answers[2].selectedOptions[0]._id, undefined); assert.equal(Registration.schema.path('answers').options.immutable, true);
    await assert.rejects(new Registration({ student: legacy.student, event: legacy.event, answers: [{ ...response.answers[0], answerText: 'x'.repeat(201) }] }).validate());
    const event = new Event({ title: 'Question validation', description: 'Campus experience description.', category: 'Technology', location: 'Studio', date: new Date(), capacity: 2, organizer: legacy.student, registrationQuestions: questions }); await event.validate();
    await assert.rejects(new Event({ ...event.toObject(), registrationQuestions: [questions[0], questions[0]] }).validate());
});
