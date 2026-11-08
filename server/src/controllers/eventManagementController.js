const { ACTIVE } = require('../utils/registrationLifecycle');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { createEventSchema, updateEventSchema } = require('../validators/eventValidator');
const { plainQuestions } = require('../validators/registrationQuestions');
const { UUID, managementError, expectedEventVersion, assertFutureDate, assertEditable, creationFingerprint, publicEvent, handleManagementError } = require('../utils/eventManagement');

async function getOwnedEvent(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) throw managementError(400, 'Invalid event ID');
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id }).lean();
        if (!event) throw managementError(404, 'This event is unavailable in your workspace.');
        return res.json({ data: { ...event, hasRegistrationHistory: Boolean(await Registration.exists({ event: event._id })) } });
    } catch (error) { handleManagementError(error, res, next); }
}
async function findCreation(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        if (!UUID.test(req.params.key)) throw managementError(400, 'Invalid creation reference');
        const event = await Event.findOne({ organizer: req.user._id, creationKey: req.params.key }).lean();
        return res.json({ data: event || null });
    } catch (error) { handleManagementError(error, res, next); }
}
async function createEvent(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const result = createEventSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: 'Check your event details.', errors: result.error.flatten() });
    const key = req.get('X-Idempotency-Key');
    try {
        if (key !== undefined && !UUID.test(key)) throw managementError(400, 'Invalid creation reference');
        const fingerprint = creationFingerprint(result.data);
        async function replay() {
            const saved = await Event.findOne({ organizer: req.user._id, creationKey: key }).select('+creationFingerprint');
            if (!saved) return null;
            if (saved.creationFingerprint !== fingerprint) throw managementError(409, 'This creation reference already belongs to different event details. Check the saved event.');
            return saved;
        }
        const existing = key && await replay();
        if (existing) return res.status(200).json({ message: 'Event creation confirmed', event: publicEvent(existing) });
        assertFutureDate(result.data.date);
        let event;
        try { event = await Event.create({ ...result.data, registrationQuestionsVersion: result.data.registrationQuestions?.length ? 1 : 0, organizer: req.user._id, ...(key ? { creationKey: key, creationFingerprint: fingerprint } : {}) }); }
        catch (error) { if (error.code !== 11000 || !key) throw error; event = await replay(); if (!event) throw error; }
        return res.status(201).json({ message: 'Event created successfully', event: publicEvent(event) });
    } catch (error) { handleManagementError(error, res, next); }
}

async function mutateOwnedEvent(req, res, next, action) {
    res.set('Cache-Control', 'no-store');
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) throw managementError(400, 'Invalid event ID');
        const version = expectedEventVersion(req.get('X-Event-Version'));
        let updates = {};
        if (action === 'edit') {
            const parsed = updateEventSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ message: 'Check your event details.', errors: parsed.error.flatten() });
            updates = parsed.data;
            if (updates.date !== undefined) assertFutureDate(updates.date);
        } else if (Object.keys(req.body || {}).length) throw managementError(400, 'This action does not accept event fields.');
        let saved;
        await mongoose.connection.transaction(async session => {
            const event = await Event.findById(req.params.id).session(session);
            if (!event) throw managementError(404, 'Event not found');
            if (!event.organizer.equals(req.user._id)) throw managementError(403, 'You can only manage your own events.');
            if (action === 'cancel' && event.status === 'cancelled') { saved = event; return; }
            assertEditable(event, version);
            const questionsChanged = updates.registrationQuestions !== undefined && JSON.stringify(plainQuestions(event.registrationQuestions)) !== JSON.stringify(updates.registrationQuestions);
            if (questionsChanged && req.get('X-Confirm-Question-Changes') !== 'true' && await Registration.exists({ event: event._id }).session(session)) throw managementError(409, 'Existing registrations are preserved. Acknowledge the question changes before saving.', 'registrationQuestions');
            const image = updates.imageUrl === undefined ? event.imageUrl : updates.imageUrl;
            const alt = updates.imageAlt === undefined ? event.imageAlt : updates.imageAlt;
            if (action === 'edit' && image && !alt?.trim()) throw managementError(400, 'Describe the event image for people using screen readers.', 'imageAlt');
            if (updates.capacity !== undefined) {
                const count = await Registration.countDocuments({ event: event._id, ...ACTIVE }).session(session);
                if (updates.capacity < Math.max(event.registeredCount, count)) throw managementError(409, 'Capacity cannot be lower than existing registrations.', 'capacity');
            }
            if (action === 'delete') {
                if (event.registeredCount !== 0 || await Registration.exists({ event: event._id }).session(session)) throw managementError(409, 'Events with registrations cannot be deleted. Cancel the event to preserve student records.');
                const deleted = await Event.deleteOne({ _id: event._id, organizer: req.user._id, __v: event.__v, status: 'upcoming', date: { $gt: new Date() }, registeredCount: 0 }, { session });
                if (!deleted.deletedCount) throw managementError(409, 'The event changed. Refresh before trying again.');
                return;
            }
            saved = await Event.findOneAndUpdate({ _id: event._id, organizer: req.user._id, __v: event.__v, status: 'upcoming', date: { $gt: new Date() }, ...(updates.capacity === undefined ? {} : { registeredCount: { $lte: updates.capacity } }) }, { $set: action === 'cancel' ? { status: 'cancelled' } : { ...updates, ...(questionsChanged ? { registrationQuestionsVersion: (event.registrationQuestionsVersion || 0) + 1 } : {}) }, $inc: { __v: 1 } }, { session, returnDocument: 'after', runValidators: true });
            if (!saved) throw managementError(409, 'The event changed or has started. Refresh before trying again.');
        });
        return res.json({ message: action === 'delete' ? 'Event deleted successfully' : action === 'cancel' ? 'Event cancelled. Existing registration records are preserved.' : 'Event updated successfully', ...(saved ? { data: publicEvent(saved) } : {}) });
    } catch (error) { handleManagementError(error, res, next); }
}
module.exports = { getOwnedEvent, findCreation, createEvent, updateEvent: (req, res, next) => mutateOwnedEvent(req, res, next, 'edit'), cancelEvent: (req, res, next) => mutateOwnedEvent(req, res, next, 'cancel'), deleteEvent: (req, res, next) => mutateOwnedEvent(req, res, next, 'delete') };
