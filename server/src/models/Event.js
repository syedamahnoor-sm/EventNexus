
const mongoose = require("mongoose");
const { isEventImageUrl } = require('../validators/imageUrl');

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
eventSchema.index({ date: 1 });
eventSchema.index({
    category: 1,
    status: 1,
    date: 1
});
module.exports = mongoose.model("Event", eventSchema);
