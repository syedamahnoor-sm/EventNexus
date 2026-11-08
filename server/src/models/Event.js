
const mongoose = require("mongoose");
const { isEventImageUrl } = require('../validators/imageUrl');
const { definitionSchema, definitionsValid } = require('./registrationQuestionSchemas');

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },

        imageUrl: {
            type: String,
            trim: true,
            maxlength: 2048,
            validate: { validator: isEventImageUrl, message: 'Use an HTTPS image URL or a local event image path' }
        },

        imageAlt: { type: String, trim: true, maxlength: 200 },
        registrationQuestions: { type: [definitionSchema], default: undefined, validate: { validator: definitionsValid, message: 'Invalid registration questions' } },
        registrationQuestionsVersion: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },

        // Optional, server-owned creation recovery metadata; never public event content.
        creationKey: { type: String, select: false, match: /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i },
        creationFingerprint: { type: String, select: false, match: /^[a-f\d]{64}$/ },

        recap: { type: String, trim: true, maxlength: 10000 },
        highlights: {
            type: [{ type: String, trim: true, maxlength: 240, required: true }], default: undefined,
            validate: { validator: value => !value || value.length <= 8, message: 'At most eight highlights are allowed' }
        },
        gallery: {
            type: [new mongoose.Schema({
                imageUrl: { type: String, required: true, maxlength: 2048, validate: isEventImageUrl },
                alt: { type: String, required: true, trim: true, maxlength: 200 },
                caption: { type: String, trim: true, maxlength: 240 }
            }, { _id: false })], default: undefined,
            validate: { validator: value => !value || value.length <= 12, message: 'At most twelve gallery photos are allowed' }
        },

        category: {
            type: String,
            enum: [
                "Technology",
                "Workshops",
                "Competitions",
                "Career",
                "Community",
                "Other"
            ],
            required: true,
            default: "Other"
        },

        location: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        date: {
            type: Date,
            required: true
        },

        capacity: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Capacity must be a whole number"
            }
        },

        registeredCount: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: "Registered count must be a whole number"
            }
        },

        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["upcoming", "cancelled", "completed"],
            default: "upcoming"
        }
    },
    {
        timestamps: true
    }
);

eventSchema.index({ organizer: 1, date: 1 });
eventSchema.index({ organizer: 1, creationKey: 1 }, { unique: true, partialFilterExpression: { creationKey: { $type: 'string' } } });
eventSchema.index({ date: 1 });
eventSchema.index({
    category: 1,
    status: 1,
    date: 1
});
module.exports = mongoose.model("Event", eventSchema);
