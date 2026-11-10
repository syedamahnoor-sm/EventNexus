const express = require("express");
const router = express.Router();

const { registerUser, loginUser, logoutUser, getCurrentUser } = require("../controllers/authController");
const { registerSchema, loginSchema } = require("../validators/authValidation");
const validate = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth")
const { generateCsrfToken } = require("../middleware/csrf");
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.get("/me", requireAuth, getCurrentUser);
router.get("/csrf-token", generateCsrfToken, (req, res) => {
    res.status(200).json({
        csrfToken: req.session.csrfToken
    });
});

module.exports = router;
