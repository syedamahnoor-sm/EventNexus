const mongoose = require('mongoose');
const { KEY_PATTERN } = require('../services/avatarStorage');
// Durable deletion journal, never a second student identity or image store.
module.exports = mongoose.model('AvatarCleanup', new mongoose.Schema({
    key: { type: String, required: true, unique: true, match: KEY_PATTERN },
    availableAt: { type: Date, required: true, index: true }
}, { timestamps: true }));
