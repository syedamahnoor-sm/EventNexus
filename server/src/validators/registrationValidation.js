const { z } = require('zod');

// Free-text academic identifiers accommodate different university conventions.
const phonePattern = /^\+?[\d\s().-]+$/;
const attendeeSchema = z.object({
    fullName: z.string().trim().min(2, 'Enter your full name (at least 2 characters)').max(100),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
    studentId: z.string().trim().min(1, 'Enter your student ID or roll number').max(80),
    department: z.string().trim().min(2, 'Enter your department or program').max(120),
    studyStage: z.string().trim().min(1, 'Enter your semester or year').max(60),
    contactNumber: z.string().trim().max(40).refine(value => !value || (phonePattern.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15), 'Use 7–15 digits with optional +, spaces, parentheses or hyphens').optional()
}).strict();

const registerForEventSchema = z.object({ attendee: attendeeSchema }).strict();
module.exports = { attendeeSchema, registerForEventSchema, phonePattern };
