export const QUESTION_TYPES = [{ value: 'short_text', label: 'Short text' }, { value: 'long_text', label: 'Long text' }, { value: 'single_choice', label: 'Single choice' }, { value: 'multiple_choice', label: 'Multiple choice' }, { value: 'dropdown', label: 'Dropdown' }];
export const CHOICE_TYPES = ['single_choice', 'multiple_choice', 'dropdown'];
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export function normalizeQuestions(questions = []) { return questions.map((question, order) => ({ id: question.id, text: question.text.trim(), type: question.type, required: question.required, order, options: (question.options || []).map(option => ({ id: option.id, label: option.label.trim() })) })); }
export function validateQuestionDefinitions(questions = []) {
  const errors = {};
  if (!Array.isArray(questions) || questions.length > 10) return { registrationQuestions: 'Use no more than 10 questions.' };
  const seen = new Set();
  for (const question of questions) {
    if (!uuid.test(question.id) || seen.has(question.id)) errors.registrationQuestions = 'Question identifiers must be unique. Remove and re-add the affected question.';
    seen.add(question.id);
    if (!question.text.trim() || question.text.trim().length > 240 || /[<>]/.test(question.text)) errors[`question:${question.id}`] = 'Use plain question text, 1–240 characters.';
    if (!QUESTION_TYPES.some(type => type.value === question.type) || typeof question.required !== 'boolean') errors[`question:${question.id}`] = 'Choose a supported question type.';
    const options = question.options || [];
    if (CHOICE_TYPES.includes(question.type) ? options.length < 2 || options.length > 8 : options.length !== 0) errors[`options:${question.id}`] = 'Choice questions need 2–8 options; text questions have no choices.';
    const ids = new Set(), labels = new Set();
    for (const option of options) {
      if (!uuid.test(option.id) || ids.has(option.id) || labels.has(option.label.trim().toLowerCase())) errors[`options:${question.id}`] = 'Use distinct option labels and identifiers.';
      if (!option.label.trim() || option.label.trim().length > 100 || /[<>]/.test(option.label)) errors[`option:${option.id}`] = 'Use a plain-text option label, 1–100 characters.';
      ids.add(option.id); labels.add(option.label.trim().toLowerCase());
    }
  }
  return errors;
}
export function validateQuestionAnswers(questions, values) {
  const errors = {};
  for (const question of questions) {
    const value = values[question.id] ?? (question.type === 'multiple_choice' ? [] : '');
    const multiple = question.type === 'multiple_choice', choice = CHOICE_TYPES.includes(question.type);
    const validType = multiple ? Array.isArray(value) : typeof value === 'string';
    const empty = validType && (multiple ? !value.length : !value.trim());
    if (!validType) errors[`answers.${question.id}`] = 'Check the answer format.';
    else if (empty) { if (question.required) errors[`answers.${question.id}`] = 'Answer this required question.'; }
    else if (choice && (multiple ? new Set(value).size !== value.length || value.some(id => !question.options.some(option => option.id === id)) : !question.options.some(option => option.id === value))) errors[`answers.${question.id}`] = 'Choose from the current listed options.';
    else if (!choice && (value.trim().length > (question.type === 'short_text' ? 200 : 1000) || /[<>]/.test(value))) errors[`answers.${question.id}`] = `Use plain text, up to ${question.type === 'short_text' ? 200 : 1000} characters.`;
  }
  return errors;
}
export function questionSubmission(event, values) {
  const questions = event.registrationQuestions || [];
  if (!questions.length && !(event.registrationQuestionsVersion > 0)) return {};
  return { questionVersion: event.registrationQuestionsVersion || 0, answers: questions.flatMap(question => {
    const value = values[question.id];
    if (value === undefined || (Array.isArray(value) ? !value.length : !value.trim())) return [];
    return [{ questionId: question.id, value: Array.isArray(value) ? [...value] : CHOICE_TYPES.includes(question.type) ? value : value.trim() }];
  }) };
}
export function answerDisplay(question, value) {
  if (value === undefined || (Array.isArray(value) ? !value.length : !value.trim())) return 'Not provided (optional)';
  if (CHOICE_TYPES.includes(question.type)) return question.options.filter(option => (Array.isArray(value) ? value : [value]).includes(option.id)).map(option => option.label).join(', ');
  return value.trim();
}
