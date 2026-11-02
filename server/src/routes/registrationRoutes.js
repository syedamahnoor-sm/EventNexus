const express = require("express");

const {
    registerForEvent,
    cancelRegistration,
    getMyRegistrations
} = require("../controllers/registrationController");

const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
const myRegistrationsRouter = express.Router();

// Student registers for an event
router.post(
    "/:id/register",
    requireAuth,
    requireRole("student"),
    registerForEvent
);

// Student cancels registration
router.delete(
    "/:id/register",
    requireAuth,
    requireRole("student"),
    cancelRegistration
);

// Student views their registrations
myRegistrationsRouter.get(
    "/me",
    requireAuth,
    requireRole("student"),
    getMyRegistrations
);

router.get(
    "/:id/registrations",
    requireAuth,
    requireRole("organizer"),
    getEventRegistrations
);
module.exports = {
    registrationRoutes: router,
    myRegistrationsRouter
};
