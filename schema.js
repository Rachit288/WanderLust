const Joi = require('joi');

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        location: Joi.string().required(),
        description: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),
        image: Joi.string().allow("", null),
        maxGuests: Joi.number().required().min(1),
        amenities: Joi.array().items(Joi.string()).single(),
        category: Joi.array()
            .items(
                Joi.string().valid(
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
                )
            )
            .required()
            .min(1)
            .single()
    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required()
    }).required()
});

module.exports.bookingSchema = Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required().greater(Joi.ref('startDate')),
    guestCount: Joi.number().required().min(1),
    totalPrice: Joi.number().required().min(0)
});