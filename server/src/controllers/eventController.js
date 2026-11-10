const Event = require("../models/Event");
const { createEvent, updateEvent, deleteEvent, cancelEvent } = require("./eventManagementController");
const mongoose = require("mongoose")

const { updateRecapSchema } = require("../validators/eventValidator");
const { eventWindow } = require('../utils/eventLifecycle');

const getAllEvents = async (req, res, next) => {
    try {
        const allowed = ['search', 'category', 'period', 'status', 'scope', 'sort', 'page', 'limit'];
        if (Object.entries(req.query).some(([key, value]) => !allowed.includes(key) || typeof value !== 'string')) {
            return res.status(400).json({ message: 'Invalid event query parameters' });
        }
        const {
            search,
            category,
            period,
            status,
            scope = "upcoming",
            sort = scope === 'past' ? 'latest' : 'soonest'
        } = req.query;

        // Strict pagination
        const parsePositiveInteger = (value, fallback, max) => {
            if (value === undefined) return fallback;

            const text = String(value);

            if (!/^[1-9]\d*$/.test(text)) return null;

            const number = Number(text);

            if (!Number.isSafeInteger(number) || number > max) {
                return null;
            }

            return number;
        };

        const page = parsePositiveInteger(req.query.page, 1, 1000000);
        const limit = parsePositiveInteger(req.query.limit, 12, 50);

        if (page === null || limit === null) {
            return res.status(400).json({
                message: "Invalid pagination parameters"
            });
        }

        const categories = [
            "Technology",
            "Workshops",
            "Competitions",
            "Career",
            "Community",
            "Other"
        ];

        if (category && !categories.includes(category)) {
            return res.status(400).json({
                message: "Invalid event category"
            });
        }

        if (status && !["upcoming", "cancelled", "completed"].includes(status)) {
            return res.status(400).json({
                message: "Invalid event status"
            });
        }

        if (period && !["week", "month"].includes(period)) {
            return res.status(400).json({
                message: "Invalid date period"
            });
        }

        if (!["soonest", "latest"].includes(sort)) {
            return res.status(400).json({
                message: "Invalid sort option"
            });
        }

        if (!['upcoming', 'past'].includes(scope) || (scope === 'past' && (status === 'cancelled' || period))) {
            return res.status(400).json({ message: 'Invalid event scope or incompatible archive filters' });
        }
        const now = new Date();
        const filter = eventWindow(scope, status, now);

        if (category) {
            filter.category = category;
        }

        // Search across event information
        if (search) {
            if (typeof search !== "string" || search.length > 100) {
                return res.status(400).json({
                    message: "Invalid search query"
                });
            }

            const escapedSearch = search.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            if (escapedSearch) {
                filter.$or = [
                    { title: { $regex: escapedSearch, $options: "i" } },
                    { description: { $regex: escapedSearch, $options: "i" } },
                    { location: { $regex: escapedSearch, $options: "i" } }
                ];
            }
        }

        // Filter events by date
        if (period) {
            const end = new Date(now);

            if (period === "week") {
                end.setDate(end.getDate() + 7);
            } else {
                end.setMonth(end.getMonth() + 1);
            }

            filter.date = {
                ...(filter.date || {}),
                $gt: now,
                $lt: end
            };
        }

        const skip = (page - 1) * limit;

        const [events, total] = await Promise.all([
            Event.find(filter)
                .select('-registrationQuestions -registrationQuestionsVersion')
                .populate("organizer", "name")
                .sort({
                    date: sort === "soonest" ? 1 : -1,
                    _id: 1
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            Event.countDocuments(filter)
        ]);

        return res.status(200).json({
            message: "Events fetched successfully",
            data: events,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total
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
            .populate("organizer", "name")
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



const updateEventRecap = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid event ID' });
        const result = updateRecapSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: 'Invalid recap data', errors: result.error.flatten() });
        const event = await Event.findOneAndUpdate({
            _id: req.params.id, organizer: req.user._id,
            status: { $in: ['upcoming', 'completed'] }, date: { $lte: new Date() },
        }, { $set: result.data }, { returnDocument: 'after', runValidators: true });
        if (event) return res.status(200).json({ message: 'Event recap updated', data: event });
        const existing = await Event.findById(req.params.id).select('organizer');
        if (!existing) return res.status(404).json({ message: 'Event not found' });
        if (!existing.organizer.equals(req.user._id)) return res.status(403).json({ message: 'You can only update your own event recap' });
        return res.status(409).json({ message: 'Recaps are only available for non-cancelled events whose scheduled date has passed' });
    } catch (error) { next(error); }
};

module.exports = {
    createEvent,
    cancelEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    updateEventRecap
};
