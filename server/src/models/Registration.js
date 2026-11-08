
const mongoose = require("mongoose");
const studentDetailsSchema = require('./studentDetailsSchema');
const { snapshotSchema, snapshotsValid } = require('./registrationQuestionSchemas');
const { ACTIVE_INDEX, ACTIVE_KEYS, ACTIVE_PARTIAL } = require('../utils/registrationLifecycle');

const registrationSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ['active', 'cancelled_by_student', 'cancelled_by_organizer'], default: undefined },
        cancellation: { type: new mongoose.Schema({
            initiator: { type: String, enum: ['student', 'organizer'], required: true },
            actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            at: { type: Date, required: true },
            reason: { type: String, trim: true, maxlength: 500 },
            previousStatus: { type: String, enum: ['active'], required: true },
            resultingStatus: { type: String, enum: ['cancelled_by_student', 'cancelled_by_organizer'], required: true }
        }, { _id: false, strict: 'throw' }), default: undefined },
        attendee: { type: studentDetailsSchema, default: undefined },
        answers: { type: [snapshotSchema], default: undefined, immutable: true, validate: { validator: snapshotsValid, message: 'Invalid answer snapshots' } },
        questionVersion: { type: Number, min: 0, validate: Number.isSafeInteger, immutable: true },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Prevent the same student from registering twice
registrationSchema.index(ACTIVE_KEYS, { name: ACTIVE_INDEX, unique: true, partialFilterExpression: ACTIVE_PARTIAL });

// Efficiently retrieve students registered for an event
registrationSchema.index({ event: 1 });
registrationSchema.index({ event: 1, createdAt: -1, _id: -1 });
registrationSchema.pre('validate', function () {
    if (this.status?.startsWith('cancelled_')) {
        if (!this.cancellation || this.cancellation.resultingStatus !== this.status || `cancelled_by_${this.cancellation.initiator}` !== this.status) this.invalidate('cancellation', 'A matching cancellation audit is required');
        if (this.status === 'cancelled_by_organizer' && !require('../validators/cancellationValidation').organizerCancellation.shape.reason.safeParse(this.cancellation?.reason).success) this.invalidate('cancellation.reason', 'An organizer cancellation needs a valid reason');
    } else if (this.cancellation) this.invalidate('cancellation', 'An active registration cannot have cancellation metadata');
});

module.exports = mongoose.model(
    "Registration",
    registrationSchema
);
