const mongoose = require('mongoose');
// Durable cancellation facts only. There is deliberately no notification worker.
const schema = new mongoose.Schema({
    type: { type: String, enum: ['registration.cancelled'], required: true, immutable: true },
    version: { type: Number, default: 1, immutable: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, immutable: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, immutable: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    initiator: { type: String, enum: ['student', 'organizer'], required: true, immutable: true },
    previousStatus: { type: String, enum: ['active'], required: true, immutable: true },
    resultingStatus: { type: String, enum: ['cancelled_by_student', 'cancelled_by_organizer'], required: true, immutable: true },
    reason: { type: String, maxlength: 500, immutable: true },
    occurredAt: { type: Date, required: true, immutable: true }
}, { versionKey: false });
schema.index({ registration: 1, type: 1 }, { unique: true });
module.exports = mongoose.model('CancellationOutbox', schema);
