const mongoose = require('mongoose');
const { phonePattern } = require('../validators/registrationValidation');

// Account name/email stay canonical on User; registration snapshots remain separate.
module.exports = new mongoose.Schema({
    studentId: { type: String, trim: true, maxlength: 80 },
    department: { type: String, trim: true, maxlength: 120, validate: value => !value || value.length >= 2 },
    studyStage: { type: String, trim: true, maxlength: 60 },
    contactNumber: { type: String, trim: true, maxlength: 40, validate: value => !value || (phonePattern.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15) }
}, { _id: false });
