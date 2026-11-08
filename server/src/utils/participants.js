const { z } = require('zod');
const positive = (fallback, max) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max)).default(fallback);
const participantQuery = z.object({
    search: z.string().trim().max(120).refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Use a plain search phrase').default(''),
    sort: z.enum(['newest', 'oldest']).default('newest'),
    page: positive(1, 1000000), limit: positive(12, 50)
}).strict();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rosterFields = { _id: 1, createdAt: 1, 'attendee.fullName': 1, 'attendee.email': 1, 'attendee.studentId': 1, 'attendee.department': 1, 'attendee.studyStage': 1 };
function rosterPipeline(event, { search, sort, page, limit }) {
    const matching = search ? [{ $match: { $or: ['fullName', 'email', 'studentId'].map(field => ({ [`attendee.${field}`]: { $regex: escapeRegex(search), $options: 'i' } })) } }] : [];
    const direction = sort === 'oldest' ? 1 : -1;
    return [{ $match: { event } }, { $sort: { createdAt: direction, _id: direction } }, { $facet: {
        total: [{ $count: 'value' }], matching: [...matching, { $count: 'value' }],
        rows: [...matching, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: rosterFields }]
    } }];
}
module.exports = { participantQuery, escapeRegex, rosterPipeline };
