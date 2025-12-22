const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["BOOKING_REQUEST", "BOOKING_CONFIRMED", "PAYMENT_RECEIVED", "CANCELLED", "REMINDER", "REVIEW_REQUEST", "UNFINISHED_BOOKING", "NEW_MESSAGE", "NEW_REVIEW", "WISHLIST_ALERT", "PRICE_DROP", "AI_RECOMMENDATION", "AVAILABILITY_ALERT"],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    relatedModel: {
        type: String,
        enum: ["Booking", "Listing"],
        default: "Booking"
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30
    }
});

module.exports = mongoose.model("Notification", notificationSchema);