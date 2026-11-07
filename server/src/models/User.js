const mongoose = require("mongoose");
const studentProfileSchema = require('./studentProfileSchema');
const { KEY_PATTERN } = require('../services/avatarStorage');

const userSchema = new mongoose.Schema({
    profilePhoto: { type: new mongoose.Schema({
        key: { type: String, required: true, match: KEY_PATTERN },
        url: { type: String, required: true, maxlength: 2048, validate: value => { try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; } } }
    }, { _id: false }), default: undefined },
    studentProfile: { type: studentProfileSchema, default: undefined },
    profileVersion: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
        type: String,
        enum: ["student", "organizer"],
        default: "student"
    }
}, { timestamps: true });

userSchema.index({ 'profilePhoto.key': 1 }, { sparse: true });
module.exports = mongoose.model("User", userSchema);
