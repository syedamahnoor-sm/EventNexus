const { z } = require('zod');
const id = z.string().regex(/^[a-f\d]{24}$/i, 'A registration reference is required');
const studentCancellation = z.strictObject({ registrationId: id });
const organizerCancellation = z.strictObject({ confirmed: z.literal(true), reason: z.string().trim().min(5, 'Explain the cancellation in at least 5 characters').max(500).refine(value => !/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value), 'Use plain text') });
module.exports = { studentCancellation, organizerCancellation };
