export const REGISTRATION_FIELDS = [
  { name: 'fullName', label: 'Full name', max: 100, autocomplete: 'name' },
  { name: 'email', label: 'Contact email', max: 254, autocomplete: 'email', type: 'email' },
  { name: 'studentId', label: 'Student ID / roll number', max: 80, hint: 'Use the identifier issued by your university. Any format is welcome.' },
  { name: 'department', label: 'Department / academic program', max: 120 },
  { name: 'studyStage', label: 'Current semester / year', max: 60, hint: 'For example, Semester 3 or Year 2. Use your university’s convention.' },
  { name: 'contactNumber', label: 'Contact number', max: 40, autocomplete: 'tel', type: 'tel', optional: true, hint: 'Optional. Include a country code if helpful.' },
];

export function initialStudentDetails(user) {
  return { fullName: user?.name || '', email: user?.email || '', studentId: '', department: '', studyStage: '', contactNumber: '' };
}

export function validateRegistration(values) {
  const errors = {};
  for (const field of REGISTRATION_FIELDS) {
    const value = (values[field.name] || '').trim();
    if (!value && !field.optional) errors[field.name] = `Enter your ${field.label.toLowerCase()}.`;
    else if (value.length > field.max) errors[field.name] = `Use no more than ${field.max} characters.`;
  }
  if (values.fullName.trim().length < 2) errors.fullName = 'Enter your full name (at least 2 characters).';
  if (values.department.trim().length < 2) errors.department = 'Enter your department or program (at least 2 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  const phone = values.contactNumber.trim();
  const digits = phone.replace(/\D/g, '').length;
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits < 7 || digits > 15)) errors.contactNumber = 'Use 7–15 digits with optional +, spaces, parentheses or hyphens.';
  return errors;
}

export function registrationPayload(values) {
  const attendee = Object.fromEntries(REGISTRATION_FIELDS.map(field => [field.name, values[field.name].trim()]));
  attendee.email = attendee.email.toLowerCase();
  if (!attendee.contactNumber) delete attendee.contactNumber;
  return { attendee };
}
