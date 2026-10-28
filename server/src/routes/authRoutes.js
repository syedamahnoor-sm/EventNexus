
const express = require("express");
const router = express.Router();

const { registerUser } = require("../controllers/authController");
const { registerSchema } = require("../validators/authValidation");
const validate = require("../middleware/validate");

router.post("/register", validate(registerSchema), registerUser);

module.exports = router;
