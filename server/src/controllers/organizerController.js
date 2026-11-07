const Event = require('../models/Event');
const { dashboardQuery, dashboardPipeline } = require('../utils/organizerDashboard');

async function getDashboard(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const parsed = dashboardQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid dashboard filters or pagination' });
    const { view, page, limit } = parsed.data;
    const now = new Date();
    try {
        const [result] = await Event.aggregate(dashboardPipeline(req.user._id, parsed.data, now)).option({ maxTimeMS: 10000 });
        const overview = result?.overview[0] || { total: 0, upcoming: 0, past: 0, cancelled: 0, review: 0, activeRegistrations: 0, nearCapacity: 0 };
        const total = overview[view];
        return res.json({ data: { overview, next: result?.next[0] || null, events: result?.events || [], asOf: now.toISOString() }, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total } });
    } catch (error) { next(error); }
}
module.exports = { getDashboard };
