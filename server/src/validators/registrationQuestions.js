const { z } = require('zod');
const { UUID } = require('../utils/eventManagement');
const TYPES = ['short_text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown'];
const CHOICE_TYPES = ['single_choice', 'multiple_choice', 'dropdown'];
const plain = (max, min = 1) => z.string().trim().min(min).max(max).refine(value => !/[<>]/.test(value), 'Use plain text without HTML');
const identifier = z.string().regex(UUID, 'Use a stable UUID for each question and option');
const optionSchema = z.strictObject({ id: identifier, label: plain(100) });
const questionSchema = z.strictObject({ id: identifier, text: plain(240), type: z.enum(TYPES), required: z.boolean(), order: z.number().int().min(0).max(9), options: z.array(optionSchema).max(8) }).superRefine((question, ctx) => {
    if (CHOICE_TYPES.includes(question.type) ? question.options.length < 2 : question.options.length !== 0) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Choice questions need 2–8 options; text questions have no options' });
    if (new Set(question.options.map(item => item.id)).size !== question.options.length || new Set(question.options.map(item => item.label.toLowerCase())).size !== question.options.length) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Option IDs and labels must be unique within a question' });
});
const questionsSchema = z.array(questionSchema).max(10).superRefine((questions, ctx) => {
    if (new Set(questions.map(question => question.id)).size !== questions.length) ctx.addIssue({ code: 'custom', message: 'Question IDs must be unique' });
    if (questions.some((question, index) => question.order !== index)) ctx.addIssue({ code: 'custom', message: 'Question order must match its position, starting at zero' });
});
const submittedAnswersSchema = z.array(z.strictObject({ questionId: identifier, value: z.union([z.string().max(1000), z.array(z.string().max(1000)).max(8)]) })).max(10);
function answerError(status, message, errors, code) { return Object.assign(new Error(message), { status, errors, code }); }
function validateEventAnswers(event, submitted = [], version) {
    const questions = event.registrationQuestions || [];
    const currentVersion = event.registrationQuestionsVersion || 0;
    if ((questions.length && version === undefined) || (version !== undefined && version !== currentVersion)) throw answerError(409, 'The event questions changed. Review the current questions before submitting.', undefined, 'QUESTIONS_CHANGED');
    const structural = submittedAnswersSchema.safeParse(submitted);
    if (!structural.success) throw answerError(400, 'Check your event answers.', [{ field: 'answers', message: 'Answers must use question IDs and bounded text or choice values.' }]);
    const errors = [], seen = new Set(), supplied = new Map();
    for (const answer of structural.data) {
        if (seen.has(answer.questionId) || !questions.some(question => question.id === answer.questionId)) errors.push({ field: 'answers', message: 'Duplicate or unknown question ID.' });
        seen.add(answer.questionId); supplied.set(answer.questionId, answer.value);
    }
    const snapshots = [];
    for (const question of questions) {
        const value = supplied.get(question.id), field = `answers.${question.id}`;
        if (value === undefined) { if (question.required) errors.push({ field, message: 'Answer this required question.' }); continue; }
        const choice = CHOICE_TYPES.includes(question.type), multiple = question.type === 'multiple_choice';
        if (multiple ? !Array.isArray(value) : typeof value !== 'string') { errors.push({ field, message: multiple ? 'Choose one or more listed options.' : 'Provide one text or single-choice value.' }); continue; }
        const empty = multiple ? value.length === 0 : value.trim().length === 0;
        if (empty) { if (question.required) errors.push({ field, message: 'Answer this required question.' }); continue; }
        const snapshot = { questionId: question.id, questionText: question.text, questionType: question.type, required: question.required, order: question.order };
        if (choice) {
            const selected = multiple ? value : [value];
            if (new Set(selected).size !== selected.length || selected.some(id => !question.options.some(option => option.id === id))) { errors.push({ field, message: 'Choose only the listed options, without duplicates.' }); continue; }
            snapshot.selectedOptions = question.options.filter(option => selected.includes(option.id)).map(option => ({ id: option.id, label: option.label }));
        } else {
            const max = question.type === 'short_text' ? 200 : 1000;
            if (value.trim().length > max || /[<>]/.test(value)) { errors.push({ field, message: `Use plain text, up to ${max} characters.` }); continue; }
            snapshot.answerText = value.trim();
        }
        snapshots.push(snapshot);
    }
    if (errors.length) throw answerError(400, 'Check your event answers.', errors);
    return { answers: snapshots, questionVersion: currentVersion };
}
function plainQuestions(value) { return (value || []).map(question => ({ id: question.id, text: question.text, type: question.type, required: question.required, order: question.order, options: (question.options || []).map(option => ({ id: option.id, label: option.label })) })); }
module.exports = { TYPES, CHOICE_TYPES, questionsSchema, submittedAnswersSchema, validateEventAnswers, plainQuestions };
