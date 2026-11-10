
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { validateEventAnswers } = require('../validators/registrationQuestions');
const { ACTIVE, assertLifecycleReady, studentRegistration } = require('../utils/registrationLifecycle');
const { cancelRegistrationRecord } = require('../utils/cancelRegistrationRecord');

const getMyEventRegistration = async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid event ID' });
    try {
        const filter = { student: req.user._id, event: req.params.id }; const registration = await Registration.findOne({ ...filter, ...ACTIVE }).lean() || await Registration.findOne(filter).sort({ 'cancellation.at': -1, createdAt: -1, _id: -1 }).lean();
        return res.status(200).json({ data: studentRegistration(registration) });
    } catch (error) { next(error); }
};

const registerForEvent = async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
            message: "Invalid event ID"
        });
    }

    try {
        await assertLifecycleReady(Registration.collection, { allowLegacy: true });
        let createdRegistration;

        await mongoose.connection.transaction(async (session) => {
            // Check first so an existing registration stays recognizable even when full.
            if (await Registration.exists({ student: req.user._id, event: id, ...ACTIVE }).session(session)) {
                const error = new Error('You are already registered for this event');
                error.status = 409;
                throw error;
            }
            if (await Registration.exists({ student: req.user._id, event: id, status: { $in: ['cancelled_by_student', 'cancelled_by_organizer'] } }).session(session)) await assertLifecycleReady(Registration.collection);
            const current = await Event.findById(id).session(session);
            if (!current || current.status !== 'upcoming' || current.date <= new Date() || current.registeredCount >= current.capacity) throw Object.assign(new Error('Event unavailable or fully booked'), { status: 409 });
            // Validate against the authoritative definitions within the same transaction.
            const answers = validateEventAnswers(current, req.body.answers, req.body.questionVersion);
            const revision = current.registrationQuestionsVersion || 0;
            // Reserve a seat only if the event is eligible and its questions still match.
            const event = await Event.findOneAndUpdate(
                {
                    _id: id,
                    status: "upcoming",
                    date: { $gt: new Date() },
                    ...(revision === 0 ? { $or: [{ registrationQuestionsVersion: 0 }, { registrationQuestionsVersion: { $exists: false } }] } : { registrationQuestionsVersion: revision }),
                    $expr: {
                        $lt: ["$registeredCount", "$capacity"]
                    }
                },
                {
                    $inc: { registeredCount: 1 }
                },
                {
                    returnDocument: 'after',
                    session
                }
            );

            if (!event) {
                const error = new Error("Event unavailable or fully booked");
                error.status = 409;
                throw error;
            }

            // Create registration within the same transaction
            const registrations = await Registration.create(
                [{
                    status: 'active',
                    student: req.user._id,
                    event: event._id,
                    attendee: req.body.attendee,
                    ...(answers.answers.length || revision > 0 ? answers : {})
                }],
                { session }
            );

            createdRegistration = registrations[0];
        });

        return res.status(201).json({
            message: "Registration successful",
            data: studentRegistration(createdRegistration)
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You are already registered for this event"
            });
        }

        if (error.status === 409 || error.status === 400 || error.status === 503) {
            return res.status(error.status).json({
                message: error.message,
                ...(error.code ? { code: error.code } : {}),
                ...(error.errors ? { errors: error.errors } : {})
            });
        }

        next(error);
    }
};


const cancelRegistration = async (req, res, next) => {
    try {
        const result = await cancelRegistrationRecord({ eventId: req.params.id, registrationId: req.body.registrationId, actor: req.user._id, initiator: 'student' });
        res.json({ message: 'Registration cancelled', data: studentRegistration(result.registration), alreadyCancelled: result.alreadyCancelled });
    } catch (error) { if ([400, 403, 404, 409, 503].includes(error.status)) return res.status(error.status).json({ message: error.message, ...(error.code ? { code: error.code } : {}) }); next(error); }
};
const getMyRegistrations = async (req, res, next) => {
    try {
        const registrations = await Registration.find({
            student: req.user._id
        })
            .populate({
                path: "event",
                select: "title description category location date capacity registeredCount status imageUrl imageAlt",
                populate: {
                    path: "organizer",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            message: "Registrations fetched successfully",
            data: registrations.map(studentRegistration)
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getMyEventRegistration,
    registerForEvent,
    cancelRegistration,
    getMyRegistrations,
    getEventRegistrations: require('./participantController').getEventRegistrations
};
