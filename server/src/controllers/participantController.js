const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { participantQuery, rosterPipeline } = require('../utils/participants');
const { cancelRegistrationRecord } = require('../utils/cancelRegistrationRecord');

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
        res.json({ event: { ...event, id: event._id }, data: result.rows.map(row => ({ ...row, status: row.status || 'active' })), total, rosterTotal: result.total[0]?.value || 0, activeTotal: result.active[0]?.value || 0,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } });
    } catch (error) { next(error); }
}
async function getEventRegistration(req, res, next) {
    try {
        const event = await ownedEvent(req, res); if (!event) return;
        if (!mongoose.isObjectIdOrHexString(req.params.registrationId)) return res.status(400).json({ message: 'Invalid registration reference' });
        const registration = await Registration.findOne({ _id: req.params.registrationId, event: event._id }).select('_id attendee answers questionVersion createdAt status cancellation').lean();
        if (!registration) return res.status(404).json({ message: 'This registration is no longer on record for this event.' });
        res.json({ event: { ...event, id: event._id }, data: { ...registration, status: registration.status || 'active' } });
    } catch (error) { next(error); }
}
async function cancelParticipant(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        const result = await cancelRegistrationRecord({ eventId: req.params.id, registrationId: req.params.registrationId, actor: req.user._id, initiator: 'organizer', reason: req.body.reason });
        res.json({ message: 'Registration cancellation recorded', data: result.registration, alreadyCancelled: result.alreadyCancelled });
    } catch (error) { if ([400, 403, 404, 409, 503].includes(error.status)) return res.status(error.status).json({ message: error.message, ...(error.code ? { code: error.code } : {}) }); next(error); }
}
module.exports = { getEventRegistrations, getEventRegistration, cancelParticipant };
