const { z } = require("zod");

const createEventSchema = z.strictObject({
    title: z.string().trim().min(3).max(120),

    description: z.string().trim().min(10).max(2000),

    location: z.string().trim().min(3).max(200),

    date: z.iso.datetime({ offset: true }),

    capacity: z.number().int().min(1)
});

const updateEventSchema = createEventSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field must be provided"
    }
);

module.exports = { createEventSchema, updateEventSchema };