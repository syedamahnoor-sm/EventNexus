
const mongoose = require("mongoose");
const studentDetailsSchema = require('./studentDetailsSchema');
const { snapshotSchema, snapshotsValid } = require('./registrationQuestionSchemas');

const registrationSchema = new mongoose.Schema(
    {
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
registrationSchema.index(
    { student: 1, event: 1 },
    { unique: true }
);

// Efficiently retrieve students registered for an event
registrationSchema.index({ event: 1 });
registrationSchema.index({ event: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model(
    "Registration",
    registrationSchema
);
