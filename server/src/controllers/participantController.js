const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { participantQuery, rosterPipeline } = require('../utils/participants');

async function ownedEvent(req, res) {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) { res.status(400).json({ message: 'Invalid event ID' }); return null; }
    const event = await Event.findById(req.params.id).select('_id title organizer date location status capacity').lean();
    if (!event) { res.status(404).json({ message: 'Event not found' }); return null; }
    if (String(event.organizer) !== String(req.user._id)) { res.status(403).json({ message: 'You can only view registrations for your own events' }); return null; }
    delete event.organizer;
    return event;
}
async function getEventRegistrations(req, res, next) {
    try {
        const event = await ownedEvent(req, res); if (!event) return;
        const query = participantQuery.safeParse(req.query);
        if (!query.success) return res.status(400).json({ message: 'Check search, sort and pagination values.' });
        const { page, limit } = query.data;
        const [result] = await Registration.aggregate(rosterPipeline(event._id, query.data)).option({ maxTimeMS: 10000 });
        const total = result.matching[0]?.value || 0, totalPages = Math.ceil(total / limit);
        res.json({ event: { ...event, id: event._id }, data: result.rows, total, rosterTotal: result.total[0]?.value || 0,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } });
    } catch (error) { next(error); }
}
async function getEventRegistration(req, res, next) {
    try {
        const event = await ownedEvent(req, res); if (!event) return;
        if (!mongoose.isObjectIdOrHexString(req.params.registrationId)) return res.status(400).json({ message: 'Invalid registration reference' });
        const registration = await Registration.findOne({ _id: req.params.registrationId, event: event._id }).select('_id attendee answers questionVersion createdAt').lean();
        if (!registration) return res.status(404).json({ message: 'This registration is no longer on record for this event.' });
        res.json({ event: { ...event, id: event._id }, data: registration });
    } catch (error) { next(error); }
}
module.exports = { getEventRegistrations, getEventRegistration };
