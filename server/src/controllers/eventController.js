const Event = require("../models/Event");
const { createEventSchema } = require("../validators/eventValidator");
const mongoose = require("mongoose")

const Event = require("../models/Event");
const { createEventSchema, updateEventSchema } = require("../validators/eventValidator");

const createEvent = async (req, res, next) => {
    try {
        // Step 1: Validate incoming request data
        const result = createEventSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid event data",
                errors: result.error.flatten()
            });
        }

        // Step 2: Create the event in MongoDB
        const event = await Event.create({
            ...result.data,
            organizer: req.user._id
        });

        // Step 3: Return the created event
        return res.status(201).json({
            message: "Event created successfully",
            event
        });

    } catch (error) {
        next(error);
    }
};


const getAllEvents = async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                message: "Invalid pagination parameters"
            });
        }

        const skip = (page - 1) * limit;

        // Optional filtering by event status
        const filter = {};

        if (req.query.status) {
            const allowedStatuses = [
                "upcoming",
                "cancelled",
                "completed"
            ];

            if (!allowedStatuses.includes(req.query.status)) {
                return res.status(400).json({
                    message: "Invalid event status"
                });
            }

            filter.status = req.query.status;
        }

        // Fetch matching events
        const events = await Event.find(filter)
            .populate("organizer", "name email")
            .sort({ date: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Count total matching events
        const total = await Event.countDocuments(filter);

        return res.status(200).json({
            message: "Events fetched successfully",
            data: events,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        next(error);
    }
};

const getEventById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        const event = await Event.findById(id)
            .populate("organizer", "name email")
            .lean();

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        return res.status(200).json({
            message: "Event fetched successfully",
            data: event
        });

    } catch (error) {
        next(error);
    }
};



const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate event ID
        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        // Validate incoming update data
        const result = updateEventSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid update data",
                errors: result.error.flatten()
            });
        }

        const updates = result.data;

        // Conditions required for every update
        const filter = {
            _id: id,
            organizer: req.user._id,
            status: "upcoming"
        };

        // Capacity must not fall below current registrations
        if (updates.capacity !== undefined) {
            filter.registeredCount = {
                $lte: updates.capacity
            };
        }

        // Atomically check conditions and update
        const updatedEvent = await Event.findOneAndUpdate(
            filter,
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedEvent) {
            // Determine why the update was rejected
            const event = await Event.findById(id);

            if (!event) {
                return res.status(404).json({
                    message: "Event not found"
                });
            }

            if (!event.organizer.equals(req.user._id)) {
                return res.status(403).json({
                    message: "You can only update your own events"
                });
            }

            if (event.status !== "upcoming") {
                return res.status(409).json({
                    message: "Only upcoming events can be updated"
                });
            }

            return res.status(409).json({
                message: "Capacity cannot be lower than current registrations"
            });
        }

        return res.status(200).json({
            message: "Event updated successfully",
            data: updatedEvent
        });

    } catch (error) {
        next(error);
    }
};


const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(400).json({
                message: "Invalid event ID"
            });
        }

        // Atomically delete only if all conditions match
        const deletedEvent = await Event.findOneAndDelete({
            _id: id,
            organizer: req.user._id,
            status: "upcoming",
            registeredCount: 0
        });

        if (!deletedEvent) {
            const event = await Event.findById(id);

            if (!event) {
                return res.status(404).json({
                    message: "Event not found"
                });
            }

            if (!event.organizer.equals(req.user._id)) {
                return res.status(403).json({
                    message: "You can only delete your own events"
                });
            }

            return res.status(409).json({
                message: "Event cannot be deleted in its current state"
            });
        }

        return res.status(200).json({
            message: "Event deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
};
