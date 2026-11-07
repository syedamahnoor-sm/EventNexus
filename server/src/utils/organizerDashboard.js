const { z } = require('zod');

const positive = (fallback, max) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max)).default(fallback);
const dashboardQuery = z.object({
    view: z.enum(['upcoming', 'past', 'cancelled', 'review']).default('upcoming'),
    page: positive(1, 1000000),
    limit: positive(8, 24)
}).strict();

// A date is a scheduled start, not proof that an event ended or someone attended.
function organizerState(event, now = new Date()) {
    if (event.status === 'cancelled') return 'cancelled';
    const date = event.date && new Date(event.date).getTime();
    if (!Number.isFinite(date)) return 'review';
    if (event.status === 'upcoming' && date > Number(now)) return 'upcoming';
    if (['upcoming', 'completed'].includes(event.status) && date <= Number(now)) return 'past';
    return 'review';
}

function dashboardPipeline(organizer, { view, page, limit }, now) {
    const count = condition => ({ $sum: { $cond: [condition, 1, 0] } });
    return [
        { $match: { organizer } },
        { $project: { title: 1, category: 1, date: 1, location: 1, status: 1, capacity: 1, imageUrl: 1, imageAlt: 1 } },
        { $set: { phase: { $switch: { branches: [
            { case: { $eq: ['$status', 'cancelled'] }, then: 'cancelled' },
            { case: { $and: [{ $eq: [{ $type: '$date' }, 'date'] }, { $eq: ['$status', 'upcoming'] }, { $gt: ['$date', now] }] }, then: 'upcoming' },
            { case: { $and: [{ $eq: [{ $type: '$date' }, 'date'] }, { $in: ['$status', ['upcoming', 'completed']] }, { $lte: ['$date', now] }] }, then: 'past' }
        ], default: 'review' } } } },
        // Count records, never populate attendee snapshots or student accounts.
        { $lookup: { from: 'registrations', localField: '_id', foreignField: 'event', pipeline: [{ $count: 'total' }], as: 'registrationTotal' } },
        { $set: { registeredCount: { $ifNull: [{ $arrayElemAt: ['$registrationTotal.total', 0] }, 0] } } },
        { $unset: 'registrationTotal' },
        { $set: { remainingSeats: { $max: [0, { $subtract: ['$capacity', '$registeredCount'] }] }, nearCapacity: { $and: [{ $eq: ['$phase', 'upcoming'] }, { $gt: ['$capacity', 0] }, { $gte: ['$registeredCount', { $multiply: ['$capacity', 0.8] }] }] } } },
        { $facet: {
            overview: [{ $group: { _id: null, total: { $sum: 1 }, upcoming: count({ $eq: ['$phase', 'upcoming'] }), past: count({ $eq: ['$phase', 'past'] }), cancelled: count({ $eq: ['$phase', 'cancelled'] }), review: count({ $eq: ['$phase', 'review'] }), activeRegistrations: { $sum: '$registeredCount' }, nearCapacity: count('$nearCapacity') } }, { $unset: '_id' }],
            next: [{ $match: { phase: 'upcoming' } }, { $sort: { date: 1, _id: 1 } }, { $limit: 1 }],
            events: [{ $match: { phase: view } }, { $sort: { date: view === 'upcoming' || view === 'review' ? 1 : -1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }]
        } }
    ];
}
module.exports = { dashboardQuery, dashboardPipeline, organizerState };
