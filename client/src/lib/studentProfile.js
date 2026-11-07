export const PROFILE_FIELDS = [
  { name: 'name', label: 'Full name', max: 100, autoComplete: 'name', required: true },
  { name: 'studentId', label: 'Student ID / roll number', max: 80, hint: 'Use your university’s format. You can add this later.' },
  { name: 'department', label: 'Department / academic program', max: 120 },
  { name: 'studyStage', label: 'Current semester / year', max: 60, hint: 'Use your university’s convention, such as Semester 3 or Year 2.' },
  { name: 'contactNumber', label: 'Contact number', max: 40, type: 'tel', autoComplete: 'tel', hint: 'Optional. 7–15 digits, with a country code if helpful.' }
];
export function profileValues(user) {
  return Object.fromEntries(PROFILE_FIELDS.map(field => [field.name, field.name === 'name' ? user.name : user.studentProfile?.[field.name] || '']));
}
export function profilePayload(values, version) {
  return { version, ...Object.fromEntries(PROFILE_FIELDS.map(field => [field.name, values[field.name].trim()])) };
}
export function validateProfile(values) {
  const errors = {};
  for (const field of PROFILE_FIELDS) {
    if ((values[field.name] || '').trim().length > field.max) errors[field.name] = `Use no more than ${field.max} characters.`;
  }
  if (values.name.trim().length < 2) errors.name = 'Enter your full name (at least 2 characters).';
  if (values.department.trim() && values.department.trim().length < 2) errors.department = 'Use at least 2 characters, or leave this blank.';
  const phone = values.contactNumber.trim(), digits = phone.replace(/\D/g, '').length;
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits < 7 || digits > 15)) errors.contactNumber = 'Use 7–15 digits with optional +, spaces, parentheses or hyphens.';
  return errors;
}
export function profileCompleteness(user) {
  const values = { ...user.studentProfile, name: user.name, email: user.email };
  const fields = ['name', 'email', 'studentId', 'department', 'studyStage'];
  const complete = fields.filter(key => Boolean(values[key]?.trim())).length;
  return { complete, total: fields.length, percent: Math.round(complete / fields.length * 100) };
}
export function profileInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length ? [words[0], ...(words.length > 1 ? [words.at(-1)] : [])].map(word => Array.from(word)[0].toLocaleUpperCase()).join('') : '';
}

// Drafts survive SPA navigation in this tab only; never write profile data to browser storage.
const drafts = new Map();
export const readProfileDraft = userId => drafts.get(userId) || null;
export const storeProfileDraft = (userId, draft) => drafts.set(userId, { version: draft.version, values: { ...draft.values }, baseValues: { ...draft.baseValues } });
export const clearProfileDraft = userId => drafts.delete(userId);
export function clearOtherProfileDrafts(userId) { for (const key of drafts.keys()) if (key !== userId) drafts.delete(key); }
