const express = require("express");

const {
    registerForEvent,
    cancelRegistration,
    getMyRegistrations,
    getMyEventRegistration,
    getEventRegistrations
} = require("../controllers/registrationController");

const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const validate = require('../middleware/validate');
const { registerForEventSchema } = require('../validators/registrationValidation');

const router = express.Router();
const myRegistrationsRouter = express.Router();
router.get('/:id/registration', requireAuth, requireRole('student'), getMyEventRegistration);

// Student registers for an event
router.post(
    "/:id/register",
    requireAuth,
    requireRole("student"),
    validate(registerForEventSchema),
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
    (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); },
    requireAuth,
    requireRole("organizer"),
    getEventRegistrations
);
router.get('/:id/registrations/:registrationId',
    (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); },
    requireAuth, requireRole('organizer'), require('../controllers/participantController').getEventRegistration);
module.exports = {
    registrationRoutes: router,
    myRegistrationsRouter
};
