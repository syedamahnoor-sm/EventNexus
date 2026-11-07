const { z } = require("zod");
const { isEventImageUrl } = require('./imageUrl');
const eventCategory = z.enum(['Technology', 'Workshops', 'Competitions', 'Career', 'Community', 'Other']);

const createEventSchema = z.strictObject({
    title: z.string().trim().min(3).max(120),

    description: z.string().trim().min(10).max(2000),

    imageUrl: z.string().trim().max(2048).refine(isEventImageUrl, 'Use an HTTPS image URL or a local event image path').optional(),
    imageAlt: z.string().trim().max(200).optional(),

    location: z.string().trim().min(3).max(200),

    date: z.iso.datetime({ offset: true }),

    capacity: z.number().int().min(1),
    category: eventCategory.default("Other"),
});

// Zod defaults still run inside partial objects. An image-only PATCH must not reset category.
const updateEventSchema = createEventSchema.partial().extend({ category: eventCategory.optional() }).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field must be provided"
    }
);

module.exports = { createEventSchema, updateEventSchema };
