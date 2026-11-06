const express = require("express");

const {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
} = require("../controllers/eventController");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// Public routes
router.get("/", getAllEvents);
router.get("/:id", getEventById);

// Organizer-only route
router.post(
    "/",
    requireAuth,
    requireRole("organizer"),
    createEvent
);
router.patch(
    "/:id",
    requireAuth,
    requireRole("organizer"),
    updateEvent
);
router.delete(
    "/:id",
    requireAuth,
    requireRole("organizer"),
    deleteEvent
);

module.exports = router;