const mongoose = require('mongoose');
const { phonePattern } = require('../validators/registrationValidation');

// Reusable for a future profile. Registration keeps the submitted details at that instant.
module.exports = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    studentId: { type: String, required: true, trim: true, maxlength: 80 },
    department: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    studyStage: { type: String, required: true, trim: true, maxlength: 60 },
    contactNumber: { type: String, trim: true, maxlength: 40, validate: value => !value || (phonePattern.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15) }
}, { _id: false });
