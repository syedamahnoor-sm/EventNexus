const express = require("express");
const router = express.Router();

const { registerUser, loginUser, logoutUser, getCurrentUser } = require("../controllers/authController");
const { registerSchema, loginSchema } = require("../validators/authValidation");
const validate = require("../middleware/validate");
const requireAuth = require("../middleware/requireAuth")

router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.get("/me", requireAuth, getCurrentUser);

module.exports = router;
