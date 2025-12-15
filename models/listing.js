const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const { required } = require("joi");

const listingSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    image: {
        url: String,
        filename: String
    },
    gallery: [
        {
            url: String,
            filename: String
        }
    ],
    price: Number,
    location: String,
    country: String,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    category: {
        type: [String],
        enum: [
            "Architectural Gems",
            "Private Islands",
            "Urban Lofts",
            "Forest Retreats",
            "Historic Castles",
            "Alpine Chalets",
            "Desert Oases",
            "Vineyard Estates",
            "Cliffside Havens",
            "Modern Glasshouses"
        ]
    },
    maxGuests: {
        type: Number,
        required: true,
        default: 1
    },
    amenities: {
        type: [String],
        default: []
    },
    text_for_ai: {
        type: String
    }
});

listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;