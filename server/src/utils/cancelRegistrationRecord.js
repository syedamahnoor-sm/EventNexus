const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Outbox = require('../models/CancellationOutbox');
const { ACTIVE, isActive, assertLifecycleReady } = require('./registrationLifecycle');
const { organizerCancellation } = require('../validators/cancellationValidation');
const fail = (status, message) => Object.assign(new Error(message), { status });
async function cancelRegistrationRecord({ eventId, registrationId, actor, initiator, reason }) {
    if (!mongoose.isObjectIdOrHexString(eventId) || !mongoose.isObjectIdOrHexString(registrationId)) throw fail(400, 'Invalid event or registration reference');
    if (!['student', 'organizer'].includes(initiator)) throw fail(400, 'Invalid cancellation initiator');
    if (initiator === 'organizer') { const parsed = organizerCancellation.shape.reason.safeParse(reason); if (!parsed.success) throw fail(400, 'Provide a plain-text cancellation reason of 5–500 characters'); reason = parsed.data; }
    await assertLifecycleReady(Registration.collection);
    let result;
    await mongoose.connection.transaction(async session => {
        const event = await Event.findById(eventId).session(session);
        if (!event) throw fail(404, 'Event not found');
        if (initiator === 'organizer' && !event.organizer.equals(actor)) throw fail(403, 'You can only manage registrations for your own events');
        const filter = { _id: registrationId, event: eventId, ...(initiator === 'student' ? { student: actor } : {}) };
        const registration = await Registration.findOne(filter).session(session);
        if (!registration) throw fail(404, 'Registration not found for this event and account');
        if (!isActive(registration)) { result = { registration, alreadyCancelled: true }; return; }
        const at = new Date();
        if (event.status !== 'upcoming' || event.date <= at) throw fail(409, 'Cancellation is closed. The event has started, ended or been cancelled.');
        const released = await Event.updateOne({ _id: eventId, status: 'upcoming', date: { $gt: at }, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } }, { session });
        if (!released.modifiedCount) throw fail(409, 'Availability could not be verified. No registration was changed.');
        const status = `cancelled_by_${initiator}`;
        const cancellation = { initiator, actor, at, previousStatus: 'active', resultingStatus: status, ...(reason ? { reason } : {}) };
        // A terminal transition per registration. Re-registration creates a new reference.
        const updated = await Registration.findOneAndUpdate({ ...filter, ...ACTIVE }, { $set: { status, cancellation }, $inc: { __v: 1 } }, { session, runValidators: true, returnDocument: 'after' });
        if (!updated) throw fail(409, 'Registration changed. Check its saved status before trying again.');
        await Outbox.create([{ type: 'registration.cancelled', registration: registration._id, event: event._id, student: registration.student, actor, initiator, previousStatus: 'active', resultingStatus: status, ...(reason ? { reason } : {}), occurredAt: at }], { session });
        result = { registration: updated, alreadyCancelled: false };
    });
    return result;
}
module.exports = { cancelRegistrationRecord };
