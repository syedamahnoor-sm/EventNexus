
const mongoose = require("mongoose");
const studentDetailsSchema = require('./studentDetailsSchema');

const registrationSchema = new mongoose.Schema(
    {
        attendee: { type: studentDetailsSchema, default: undefined },
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

module.exports = mongoose.model(
    "Registration",
    registrationSchema
);
