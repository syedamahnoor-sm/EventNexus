const { z } = require("zod");
const { isEventImageUrl } = require('./imageUrl');
const eventCategory = z.enum(['Technology', 'Workshops', 'Competitions', 'Career', 'Community', 'Other']);

const eventFieldsSchema = z.strictObject({
    title: z.string().trim().min(3).max(120),

    description: z.string().trim().min(10).max(2000),

    imageUrl: z.string().trim().max(2048).refine(isEventImageUrl, 'Use an HTTPS image URL or a local event image path').optional(),
    imageAlt: z.string().trim().max(200).optional(),

    location: z.string().trim().min(3).max(200),

    date: z.iso.datetime({ offset: true }),

    capacity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    category: eventCategory.default("Other"),
});
const createEventSchema = eventFieldsSchema.superRefine((data, ctx) => {
    if (data.imageUrl && !data.imageAlt) ctx.addIssue({ code: 'custom', path: ['imageAlt'], message: 'Describe the event image for people using screen readers' });
});

// Zod defaults still run inside partial objects. An image-only PATCH must not reset category.
const updateEventSchema = eventFieldsSchema.partial().extend({ category: eventCategory.optional() }).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field must be provided"
    }
);

const updateRecapSchema = z.strictObject({
    recap: z.string().trim().max(10000).optional(),
    highlights: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
    gallery: z.array(z.strictObject({
        imageUrl: z.string().trim().min(1).max(2048).refine(isEventImageUrl),
        alt: z.string().trim().min(1).max(200),
        caption: z.string().trim().max(240).optional(),
    })).max(12).optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one recap field is required');

module.exports = { createEventSchema, updateEventSchema, updateRecapSchema };
