const { z } = require('zod');
const { attendeeSchema } = require('./registrationValidation');

// Share registration bounds/conventions, but permit incomplete saved profiles.
const optionalDetail = schema => z.union([schema, z.string().trim().length(0)]).optional();
const updateProfileSchema = z.object({
    version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1),
    name: attendeeSchema.shape.fullName.optional(),
    studentId: optionalDetail(attendeeSchema.shape.studentId),
    department: optionalDetail(attendeeSchema.shape.department),
    studyStage: optionalDetail(attendeeSchema.shape.studyStage),
    contactNumber: attendeeSchema.shape.contactNumber
}).strict().refine(value => Object.keys(value).some(key => key !== 'version'), 'Provide at least one profile field');

module.exports = { updateProfileSchema };
