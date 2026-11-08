import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTION_TYPES, normalizeQuestions, validateQuestionDefinitions, validateQuestionAnswers, questionSubmission, answerDisplay } from './registrationQuestions.js';
import { eventFormPayload, eventFormValues, eventMatches, readEventDraft, storeEventDraft, clearEventDraft } from './eventManagement.js';
function definitions() { return QUESTION_TYPES.map(({ value: type }, order) => ({ id: crypto.randomUUID(), text: `Event question ${order + 1}`, type, required: true, order, options: order < 2 ? [] : [{ id: crypto.randomUUID(), label: 'Morning' }, { id: crypto.randomUUID(), label: 'Afternoon' }] })); }
test('builder definitions enforce type, plain text, count, identifiers and choice limits', () => {
  const questions = definitions(); assert.deepEqual(validateQuestionDefinitions(questions), {});
  assert.ok(validateQuestionDefinitions([{ ...questions[0], text: '<script>bad</script>' }])[`question:${questions[0].id}`]);
  assert.ok(validateQuestionDefinitions([{ ...questions[2], options: [] }])[`options:${questions[2].id}`]);
  assert.ok(validateQuestionDefinitions([...questions, questions[0]]).registrationQuestions);
  assert.ok(validateQuestionDefinitions(Array(11).fill(questions[0])).registrationQuestions);
});
test('reordering preserves question/option identities and normalizes only display order and whitespace', () => {
  const questions = definitions(), reversed = normalizeQuestions([...questions].reverse());
  assert.deepEqual(reversed.map(q => q.id), questions.map(q => q.id).reverse()); assert.deepEqual(reversed.map(q => q.order), [0, 1, 2, 3, 4]); assert.equal(reversed[0].options[0].id, questions[4].options[0].id);
});
test('student controls validate all five types and serialize IDs rather than client question definitions', () => {
  const questions = definitions(), values = Object.fromEntries(questions.map(q => [q.id, q.type === 'multiple_choice' ? q.options.map(o => o.id) : q.options.length ? q.options[0].id : '  Campus response  ']));
  assert.deepEqual(validateQuestionAnswers(questions, values), {});
  const result = questionSubmission({ registrationQuestions: questions, registrationQuestionsVersion: 4 }, values);
  assert.equal(result.questionVersion, 4); assert.equal(result.answers[0].value, 'Campus response'); assert.equal(result.answers[0].questionText, undefined);
  assert.equal(answerDisplay(questions[2], values[questions[2].id]), 'Morning');
  assert.equal(answerDisplay(questions[3], values[questions[3].id]), 'Morning, Afternoon');
});
test('required, invalid choices and text limits yield question-specific errors; optional omission stays absent', () => {
  const questions = definitions(); assert.equal(Object.keys(validateQuestionAnswers(questions, {})).length, 5);
  assert.ok(validateQuestionAnswers([questions[0]], { [questions[0].id]: 'x'.repeat(201) })[`answers.${questions[0].id}`]);
  assert.ok(validateQuestionAnswers([questions[2]], { [questions[2].id]: 'not-an-option' })[`answers.${questions[2].id}`]);
  const optional = questions.map(q => ({ ...q, required: false })); assert.deepEqual(validateQuestionAnswers(optional, {}), {});
  assert.deepEqual(questionSubmission({ registrationQuestions: optional, registrationQuestionsVersion: 1 }, {}), { answers: [], questionVersion: 1 }); assert.deepEqual(questionSubmission({}, {}), {});
});
test('event editor prefill, payload, recovery matching and older drafts support question arrays', () => {
  const event = { title: 'Campus workshop', description: 'A meaningful campus description', category: 'Technology', date: new Date(Date.now() + 86400000).toISOString(), location: 'Student studio', capacity: 10, registrationQuestions: definitions() };
  const values = eventFormValues(event), payload = eventFormPayload(values); assert.equal(payload.registrationQuestions.length, 5); assert.equal(eventMatches(event, payload), true);
  assert.equal(eventMatches({ ...event, registrationQuestions: [] }, payload), false);
  const legacy = { ...values }; delete legacy.registrationQuestions;
  const draft = { values: legacy, base: { ...legacy }, creationKey: crypto.randomUUID(), version: 0 }; storeEventDraft('question-owner', 'event', draft);
  assert.deepEqual(readEventDraft('question-owner', 'event').values.registrationQuestions, []); clearEventDraft('question-owner', 'event');
});
