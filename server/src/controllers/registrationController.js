
const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { validateEventAnswers } = require('../validators/registrationQuestions');

const getMyEventRegistration = async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid event ID' });
    try {
        const registration = await Registration.findOne({ student: req.user._id, event: req.params.id }).lean();
        return res.status(200).json({ data: registration });
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
        let createdRegistration;

        await mongoose.connection.transaction(async (session) => {
            // Check first so an existing registration stays recognizable even when full.
            if (await Registration.exists({ student: req.user._id, event: id }).session(session)) {
                const error = new Error('You are already registered for this event');
                error.status = 409;
                throw error;
            }
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
            data: createdRegistration
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You are already registered for this event"
            });
        }

        if (error.status === 409 || error.status === 400) {
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
    const { id } = req.params;
    const expectedId = req.body?.registrationId;
    if (expectedId !== undefined && !mongoose.isObjectIdOrHexString(expectedId)) {
        return res.status(400).json({ message: 'Invalid registration reference' });
    }

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
            message: "Invalid event ID"
        });
    }

    try {
        await mongoose.connection.transaction(async (session) => {
            // Delete only this student's registration
            const registration = await Registration.findOneAndDelete(
                {
                    student: req.user._id,
                    event: id,
                    ...(expectedId ? { _id: expectedId } : {})
                },
                { session }
            );

            if (!registration) {
                const error = new Error(
                    "You are not registered for this event"
                );
                error.status = 404;
                throw error;
            }

            // Release the reserved seat
            const event = await Event.findOneAndUpdate(
                {
                    _id: id,
                    status: 'upcoming',
                    date: { $gt: new Date() },
                    registeredCount: { $gt: 0 }
                },
                {
                    $inc: { registeredCount: -1 }
                },
                { session, new: true }
            );

            if (!event) {
                const error = new Error('Cancellation is unavailable. The event may have started, ended or been cancelled.');
                error.status = 409;
                throw error;
            }
        });

        return res.status(200).json({
            message: "Registration cancelled successfully"
        });

    } catch (error) {
        if (error.status === 404 || error.status === 409) {
            return res.status(error.status).json({
                message: error.message
            });
        }

        next(error);
    }
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
                    select: "name email"
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            message: "Registrations fetched successfully",
            data: registrations
        });

    } catch (error) {
        next(error);
    }
};


const getEventRegistrations = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        // Find the event and verify ownership
        const event = await Event.findById(id)
            .select("title organizer capacity registeredCount");

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (!event.organizer.equals(req.user._id)) {
            return res.status(403).json({
                message: "You can only view registrations for your own events"
            });
        }

        // Fetch registered students
        const registrations = await Registration.find({
            event: id
        })
            .populate("student", "name email")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            message: "Event registrations fetched successfully",
            event: {
                id: event._id,
                title: event.title,
                capacity: event.capacity,
                registeredCount: event.registeredCount
            },
            data: registrations,
            total: registrations.length
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
    getEventRegistrations
};
